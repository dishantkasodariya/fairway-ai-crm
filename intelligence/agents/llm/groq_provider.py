"""
Dev/test LLM provider — Groq's OpenAI-compatible chat-completions API with
tool (function) calling. Free tier, used while iterating on agent prompts
before switching LLM_PROVIDER to bedrock.
"""

import json
import time

import requests

from agents.llm.base import ChatResult, LLMProvider, ToolCall

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MAX_RETRIES = 5
RETRY_STATUS = {429, 500, 502, 503, 504}


class GroqProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "openai/gpt-oss-120b", max_tokens: int = 4096):
        self.api_key = api_key
        self.model = model
        self.max_tokens = max_tokens

    def _to_wire_messages(self, system: str, messages: list[dict]) -> list[dict]:
        wire = [{"role": "system", "content": system}]
        for m in messages:
            if m["role"] == "tool_result":
                wire.append(
                    {"role": "tool", "tool_call_id": m["tool_call_id"], "content": m["content"]}
                )
            elif m["role"] == "assistant":
                entry = {"role": "assistant", "content": m.get("content")}
                if m.get("tool_calls"):
                    entry["tool_calls"] = [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {"name": tc.name, "arguments": json.dumps(tc.arguments)},
                        }
                        for tc in m["tool_calls"]
                    ]
                wire.append(entry)
            else:
                wire.append({"role": m["role"], "content": m["content"]})
        return wire

    def _post_with_retry(self, payload: dict) -> requests.Response:
        for attempt in range(MAX_RETRIES):
            resp = requests.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json=payload,
                timeout=60,
            )
            if resp.status_code not in RETRY_STATUS or attempt == MAX_RETRIES - 1:
                resp.raise_for_status()
                return resp
            # Honour Retry-After, but never stall a worker for more than a minute per try.
            wait_s = min(60.0, float(resp.headers.get("retry-after", 2 ** attempt * 3)))
            time.sleep(wait_s)
        raise RuntimeError("unreachable")  # loop always returns or raises above

    def chat(
        self,
        system: str,
        messages: list[dict],
        tool_specs: list[dict],
        force_tool: str | None = None,
    ) -> ChatResult:
        wire_tools = [
            {
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["parameters"],
                },
            }
            for t in tool_specs
        ]

        tool_choice = {"type": "function", "function": {"name": force_tool}} if force_tool else "auto"
        payload = {
            "model": self.model,
            "messages": self._to_wire_messages(system, messages),
            "tools": wire_tools,
            "tool_choice": tool_choice,
            "max_tokens": self.max_tokens,
        }
        resp = self._post_with_retry(payload)
        choice = resp.json()["choices"][0]["message"]

        tool_calls = [
            ToolCall(
                id=tc["id"],
                name=tc["function"]["name"],
                arguments=json.loads(tc["function"]["arguments"] or "{}"),
            )
            for tc in (choice.get("tool_calls") or [])
        ]
        return ChatResult(content=choice.get("content"), tool_calls=tool_calls)
