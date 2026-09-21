"""
Generic tool-use loop shared by every agent task (revenue research, signal
research, ...). Structured output is forced by giving the model a
"submit_result" tool whose parameters ARE the caller's JSON schema, rather
than relying on free-text JSON parsing — this works identically across
providers that support tool calling (Groq today, Bedrock tomorrow).
"""

import logging

from agents.llm.base import LLMProvider

logger = logging.getLogger(__name__)


class AgentError(Exception):
    pass


class AgentRunner:
    def __init__(self, provider: LLMProvider, tools: list, max_steps: int = 8):
        self.provider = provider
        self.tools_by_name = {t.name: t for t in tools}
        self.max_steps = max_steps

    def run(self, system: str, user_message: str, output_schema: dict) -> dict:
        submit_spec = {
            "name": "submit_result",
            "description": "Submit your final structured answer. Call this exactly once, when you are done researching.",
            "parameters": output_schema,
        }
        tool_specs = [t.spec() for t in self.tools_by_name.values()] + [submit_spec]

        messages = [{"role": "user", "content": user_message}]

        for step in range(self.max_steps):
            is_last_step = step == self.max_steps - 1
            force_tool = "submit_result" if is_last_step else None
            result = self.provider.chat(system, messages, tool_specs, force_tool=force_tool)

            if not result.tool_calls:
                messages.append({"role": "assistant", "content": result.content, "tool_calls": []})
                messages.append(
                    {
                        "role": "user",
                        "content": (
                            "Continue by calling a tool to research further, or call "
                            "submit_result with your final answer."
                        ),
                    }
                )
                continue

            messages.append(
                {"role": "assistant", "content": result.content, "tool_calls": result.tool_calls}
            )

            for tc in result.tool_calls:
                if tc.name == "submit_result":
                    return tc.arguments

                tool = self.tools_by_name.get(tc.name)
                if tool is None:
                    output = f"Unknown tool: {tc.name}"
                else:
                    try:
                        output = tool.run(**tc.arguments)
                    except Exception as e:  # noqa: BLE001 — feed the error back to the model, don't crash the run
                        logger.warning("Tool %s failed: %s", tc.name, e)
                        output = f"Tool error: {e}"

                messages.append(
                    {"role": "tool_result", "tool_call_id": tc.id, "name": tc.name, "content": output}
                )

        raise AgentError(f"Agent did not submit a result within {self.max_steps} steps")
