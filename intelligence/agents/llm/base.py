"""
Normalized chat-with-tools interface every LLM provider (Groq for dev,
Bedrock for prod) implements, so AgentRunner and the agent prompts don't
care which one is behind the call.

Internal message format (owned by AgentRunner, translated per-provider):
    {"role": "user", "content": str}
    {"role": "assistant", "content": str | None, "tool_calls": [ToolCall]}
    {"role": "tool_result", "tool_call_id": str, "name": str, "content": str}
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class ChatResult:
    content: str | None
    tool_calls: list[ToolCall] = field(default_factory=list)


class LLMProvider(ABC):
    @abstractmethod
    def chat(
        self,
        system: str,
        messages: list[dict],
        tool_specs: list[dict],
        force_tool: str | None = None,
    ) -> ChatResult:
        """tool_specs: [{"name": str, "description": str, "parameters": <json schema>}]
        force_tool: if set, the provider must make the model call exactly this tool
        (used by AgentRunner on its final step, so the loop always terminates)."""
        raise NotImplementedError
