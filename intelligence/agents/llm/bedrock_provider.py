"""
Production LLM provider — AWS Bedrock via the Converse API, which gives a
single tool-calling wire format across model families (so this same code
path works whichever Bedrock model ID is configured).

Model split (see agents/factory.py callers): Claude Haiku 4.5 handles the
bulk search/extract grind cheaply; Claude Sonnet 5 is reserved for judgment
calls (e.g. reconciling conflicting revenue figures) by passing a different
model_id when constructing this provider.

Credentials come from the standard boto3 chain (env vars, ~/.aws/credentials,
or an instance/task role) — no custom env var names.
"""

import boto3

from agents.llm.base import ChatResult, LLMProvider, ToolCall

DEFAULT_MODEL_ID = "apac.anthropic.claude-haiku-4-5-20251001-v1:0"


class BedrockProvider(LLMProvider):
    def __init__(self, region: str, model_id: str = DEFAULT_MODEL_ID, max_tokens: int = 4096):
        self.model_id = model_id
        self.max_tokens = max_tokens
        self._client = boto3.client("bedrock-runtime", region_name=region)

    def _to_wire_messages(self, messages: list[dict]) -> list[dict]:
        wire = []
        for m in messages:
            if m["role"] == "tool_result":
                wire.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "toolResult": {
                                    "toolUseId": m["tool_call_id"],
                                    "content": [{"text": m["content"]}],
                                }
                            }
                        ],
                    }
                )
            elif m["role"] == "assistant":
                content = []
                if m.get("content"):
                    content.append({"text": m["content"]})
                for tc in m.get("tool_calls") or []:
                    content.append(
                        {"toolUse": {"toolUseId": tc.id, "name": tc.name, "input": tc.arguments}}
                    )
                wire.append({"role": "assistant", "content": content})
            else:
                wire.append({"role": "user", "content": [{"text": m["content"]}]})
        return wire

    def chat(
        self,
        system: str,
        messages: list[dict],
        tool_specs: list[dict],
        force_tool: str | None = None,
    ) -> ChatResult:
        tool_config = {
            "tools": [
                {
                    "toolSpec": {
                        "name": t["name"],
                        "description": t["description"],
                        "inputSchema": {"json": t["parameters"]},
                    }
                }
                for t in tool_specs
            ],
            "toolChoice": {"tool": {"name": force_tool}} if force_tool else {"auto": {}},
        }

        resp = self._client.converse(
            modelId=self.model_id,
            system=[{"text": system}],
            messages=self._to_wire_messages(messages),
            toolConfig=tool_config,
            inferenceConfig={"maxTokens": self.max_tokens},
        )

        content_blocks = resp["output"]["message"]["content"]
        text = next((b["text"] for b in content_blocks if "text" in b), None)
        tool_calls = [
            ToolCall(id=b["toolUse"]["toolUseId"], name=b["toolUse"]["name"], arguments=b["toolUse"]["input"])
            for b in content_blocks
            if "toolUse" in b
        ]
        return ChatResult(content=text, tool_calls=tool_calls)
