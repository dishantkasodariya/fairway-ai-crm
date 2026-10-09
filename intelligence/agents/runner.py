"""
Generic tool-use loop shared by every agent task (revenue research, signal
research, ...). Structured output is forced by giving the model a
"submit_result" tool whose parameters ARE the caller's JSON schema, rather
than relying on free-text JSON parsing — this works identically across
providers that support tool calling (Groq, Bedrock, OpenAI).

Each tool call is its own OTel span (so a job's trace shows exactly how many
searches/fetches it made and how long each took), and `tool_limits` is a hard,
code-enforced cap per tool name — independent of whatever the prompt asks for
— so a model that ignores "search at most N times" can't still run up the
Serper bill.
"""

import logging
import time

from agents.llm.base import LLMProvider
from app.observability import get_tracer

logger = logging.getLogger(__name__)


class AgentError(Exception):
    pass


class AgentRunner:
    def __init__(
        self,
        provider: LLMProvider,
        tools: list,
        max_steps: int = 8,
        tool_limits: dict[str, int] | None = None,
    ):
        self.provider = provider
        self.tools_by_name = {t.name: t for t in tools}
        self.max_steps = max_steps
        self.tool_limits = tool_limits or {}
        self.call_counts: dict[str, int] = {}
        self.last_run_stats: dict = {}

    def _budget_exhausted_message(self, tool_name: str, limit: int) -> str:
        return (
            f"{tool_name} budget exhausted ({limit}/{limit} calls used) — do not call "
            f"{tool_name} again. Call submit_result now with your best findings so far."
        )

    def run(self, system: str, user_message: str, output_schema: dict) -> dict:
        tracer = get_tracer()
        run_start = time.monotonic()
        self.call_counts = {}

        with tracer.start_as_current_span("agent.run") as run_span:
            run_span.set_attribute("agent.max_steps", self.max_steps)
            for name, limit in self.tool_limits.items():
                run_span.set_attribute(f"agent.limit.{name}", limit)

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
                    messages.append(
                        {"role": "assistant", "content": result.content, "tool_calls": [], "provider_items": result.provider_items}
                    )
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
                    {
                        "role": "assistant",
                        "content": result.content,
                        "tool_calls": result.tool_calls,
                        "provider_items": result.provider_items,
                    }
                )

                for tc in result.tool_calls:
                    if tc.name == "submit_result":
                        elapsed = time.monotonic() - run_start
                        self.last_run_stats = {
                            "steps_used": step + 1,
                            "tool_calls": dict(self.call_counts),
                            "elapsed_s": round(elapsed, 2),
                        }
                        run_span.set_attribute("agent.steps_used", step + 1)
                        run_span.set_attribute("agent.elapsed_s", round(elapsed, 2))
                        for name, count in self.call_counts.items():
                            run_span.set_attribute(f"agent.calls.{name}", count)
                        logger.info("agent.run done: %s", self.last_run_stats)
                        return tc.arguments

                    limit = self.tool_limits.get(tc.name)
                    count_so_far = self.call_counts.get(tc.name, 0)
                    if limit is not None and count_so_far >= limit:
                        output = self._budget_exhausted_message(tc.name, limit)
                        logger.info("tool %s budget exhausted (%d/%d), call skipped", tc.name, count_so_far, limit)
                    else:
                        tool = self.tools_by_name.get(tc.name)
                        self.call_counts[tc.name] = count_so_far + 1
                        with tracer.start_as_current_span(f"tool.{tc.name}") as tool_span:
                            tool_span.set_attribute("tool.name", tc.name)
                            tool_span.set_attribute("tool.call_index", count_so_far + 1)
                            for k, v in (tc.arguments or {}).items():
                                if isinstance(v, (str, int, float, bool)):
                                    tool_span.set_attribute(f"tool.arg.{k}", v)
                            if tool is None:
                                output = f"Unknown tool: {tc.name}"
                            else:
                                tool_start = time.monotonic()
                                try:
                                    output = tool.run(**tc.arguments)
                                except Exception as e:  # noqa: BLE001 — feed the error back to the model, don't crash the run
                                    logger.warning("Tool %s failed: %s", tc.name, e)
                                    output = f"Tool error: {e}"
                                    tool_span.set_attribute("tool.error", str(e))
                                tool_span.set_attribute("tool.duration_s", round(time.monotonic() - tool_start, 2))
                                tool_span.set_attribute("tool.output_chars", len(output or ""))

                    messages.append(
                        {"role": "tool_result", "tool_call_id": tc.id, "name": tc.name, "content": output}
                    )

            elapsed = time.monotonic() - run_start
            self.last_run_stats = {
                "steps_used": self.max_steps,
                "tool_calls": dict(self.call_counts),
                "elapsed_s": round(elapsed, 2),
            }
            logger.warning("agent.run exhausted steps without submit_result: %s", self.last_run_stats)
            raise AgentError(f"Agent did not submit a result within {self.max_steps} steps")
