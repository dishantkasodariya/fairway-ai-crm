"""
Production LLM provider — OpenAI's Responses API with function (tool) calling.
Plain HTTP via `requests`, same style as GroqProvider; no SDK dependency.

Stateless by design: every request sends `store: false`, so OpenAI keeps no
conversation state between calls. Reasoning models (GPT-6 Luna etc.) return
encrypted "reasoning" items alongside their tool calls, and OpenAI requires
those items to be passed back with the tool results on the next call. They
travel through AgentRunner as ChatResult.provider_items and are replayed
exactly as returned.

Function tools are sent with `strict: false`: the Responses API otherwise tries
to normalize schemas into strict mode, which would force every optional field
of our output schemas to be required.
"""

import json
import logging
import time

import requests

from agents.llm.base import ChatResult, LLMProvider, ToolCall

logger = logging.getLogger(__name__)

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
MAX_RETRIES = 4
RETRY_STATUS = {429, 500, 502, 503, 504}


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-6-luna", reasoning_effort: str = "low", max_tokens: int = 4096):
        self.api_key = api_key
        self.model = model
        self.reasoning_effort = reasoning_effort
        self.max_tokens = max_tokens

    def _to_input(self, messages: list[dict]) -> list[dict]:
        items = []
        for m in messages:
            if m["role"] == "tool_result":
                items.append({"type": "function_call_output", "call_id": m["tool_call_id"], "output": m["content"]})
            elif m["role"] == "assistant":
                # Reasoning items first, exactly as OpenAI returned them, then the turn's text and tool calls.
                items.extend(m.get("provider_items") or [])
                if m.get("content"):
                    items.append({"role": "assistant", "content": m["content"]})
                for tc in m.get("tool_calls") or []:
                    items.append(
                        {
                            "type": "function_call",
                            "call_id": tc.id,
                            "name": tc.name,
                            "arguments": json.dumps(tc.arguments),
                        }
                    )
            else:
                items.append({"role": "user", "content": m["content"]})
        return items

    def _post_with_retry(self, payload: dict) -> requests.Response:
        for attempt in range(MAX_RETRIES):
            resp = requests.post(
                OPENAI_RESPONSES_URL,
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=120,
            )
            if resp.status_code not in RETRY_STATUS or attempt == MAX_RETRIES - 1:
                resp.raise_for_status()
                return resp
            wait_s = float(resp.headers.get("retry-after", 2 ** attempt * 2))
            time.sleep(wait_s)
        raise RuntimeError("unreachable")  # loop always returns or raises above

    def chat(
        self,
        system: str,
        messages: list[dict],
        tool_specs: list[dict],
        force_tool: str | None = None,
    ) -> ChatResult:
        payload = {
            "model": self.model,
            "instructions": system,
            "input": self._to_input(messages),
            "tools": [
                {
                    "type": "function",
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["parameters"],
                    "strict": False,
                }
                for t in tool_specs
            ],
            "tool_choice": {"type": "function", "name": force_tool} if force_tool else "auto",
            "reasoning": {"effort": self.reasoning_effort},
            "max_output_tokens": self.max_tokens,
            "store": False,
            "include": ["reasoning.encrypted_content"],
        }
        data = self._post_with_retry(payload).json()

        usage = data.get("usage") or {}
        logger.info(
            "openai %s: %s in (%s cached), %s out",
            self.model,
            usage.get("input_tokens"),
            (usage.get("input_tokens_details") or {}).get("cached_tokens"),
            usage.get("output_tokens"),
        )

        texts, tool_calls, reasoning_items = [], [], []
        for item in data.get("output") or []:
            if item.get("type") == "reasoning":
                reasoning_items.append(item)
            elif item.get("type") == "function_call":
                tool_calls.append(
                    ToolCall(id=item["call_id"], name=item["name"], arguments=json.loads(item.get("arguments") or "{}"))
                )
            elif item.get("type") == "message":
                texts.extend(c.get("text", "") for c in item.get("content") or [] if c.get("type") == "output_text")

        return ChatResult(
            content="".join(texts) or None,
            tool_calls=tool_calls,
            provider_items=reasoning_items,
        )
