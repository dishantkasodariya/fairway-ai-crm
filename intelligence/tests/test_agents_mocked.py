from agents.llm.base import ChatResult, LLMProvider, ToolCall
from agents.runner import AgentError, AgentRunner
from agents.tools.base import Tool


class FakeSearchTool(Tool):
    name = "web_search"
    description = "Search the web."
    parameters = {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}

    def __init__(self, response: str = "Acme Chemicals Ltd FY2025 revenue Rs 450 Crore. https://example.com/acme"):
        self.response = response
        self.calls = []

    def run(self, query: str) -> str:
        self.calls.append(query)
        return self.response


class ScriptedProvider(LLMProvider):
    """Replays a fixed sequence of ChatResults, ignoring the actual messages —
    enough to test AgentRunner's loop mechanics without a live LLM call."""

    def __init__(self, turns: list[ChatResult]):
        self.turns = turns
        self.calls = []

    def chat(self, system, messages, tool_specs, force_tool=None):
        self.calls.append({"force_tool": force_tool, "n_messages": len(messages)})
        return self.turns.pop(0)


def test_direct_submit_with_no_tools_needed():
    provider = ScriptedProvider(
        [ChatResult(content=None, tool_calls=[ToolCall(id="1", name="submit_result", arguments={"answer": 42})])]
    )
    runner = AgentRunner(provider=provider, tools=[], max_steps=3)
    result = runner.run(system="s", user_message="u", output_schema={"type": "object"})
    assert result == {"answer": 42}


def test_tool_call_then_submit():
    search = FakeSearchTool()
    provider = ScriptedProvider(
        [
            ChatResult(content=None, tool_calls=[ToolCall(id="1", name="web_search", arguments={"query": "acme revenue"})]),
            ChatResult(content=None, tool_calls=[ToolCall(id="2", name="submit_result", arguments={"revenue_cr": 450})]),
        ]
    )
    runner = AgentRunner(provider=provider, tools=[search], max_steps=5)
    result = runner.run(system="s", user_message="u", output_schema={"type": "object"})

    assert result == {"revenue_cr": 450}
    assert search.calls == ["acme revenue"]


def test_unknown_tool_call_feeds_error_back_without_crashing():
    provider = ScriptedProvider(
        [
            ChatResult(content=None, tool_calls=[ToolCall(id="1", name="nonexistent_tool", arguments={})]),
            ChatResult(content=None, tool_calls=[ToolCall(id="2", name="submit_result", arguments={"ok": True})]),
        ]
    )
    runner = AgentRunner(provider=provider, tools=[], max_steps=5)
    result = runner.run(system="s", user_message="u", output_schema={"type": "object"})
    assert result == {"ok": True}


def test_tool_exception_is_caught_and_fed_back_as_tool_result():
    class BrokenTool(Tool):
        name = "broken"
        description = "always fails"
        parameters = {"type": "object", "properties": {}}

        def run(self, **kwargs):
            raise RuntimeError("boom")

    provider = ScriptedProvider(
        [
            ChatResult(content=None, tool_calls=[ToolCall(id="1", name="broken", arguments={})]),
            ChatResult(content=None, tool_calls=[ToolCall(id="2", name="submit_result", arguments={"ok": True})]),
        ]
    )
    runner = AgentRunner(provider=provider, tools=[BrokenTool()], max_steps=5)
    result = runner.run(system="s", user_message="u", output_schema={"type": "object"})
    assert result == {"ok": True}


def test_final_step_forces_submit_tool():
    provider = ScriptedProvider(
        [
            ChatResult(content=None, tool_calls=[ToolCall(id="1", name="web_search", arguments={"query": "x"})]),
            ChatResult(content=None, tool_calls=[ToolCall(id="2", name="submit_result", arguments={"forced": True})]),
        ]
    )
    runner = AgentRunner(provider=provider, tools=[FakeSearchTool()], max_steps=2)
    result = runner.run(system="s", user_message="u", output_schema={"type": "object"})

    assert result == {"forced": True}
    assert provider.calls[0]["force_tool"] is None
    assert provider.calls[1]["force_tool"] == "submit_result"


def test_raises_agent_error_if_final_forced_step_still_yields_no_submit():
    # Degenerate case: even a forced call somehow returns no tool_calls at all.
    provider = ScriptedProvider([ChatResult(content="I refuse", tool_calls=[])])
    runner = AgentRunner(provider=provider, tools=[], max_steps=1)
    try:
        runner.run(system="s", user_message="u", output_schema={"type": "object"})
        assert False, "expected AgentError"
    except AgentError:
        pass
