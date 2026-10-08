import json

import pytest

from agents.llm import openai_provider
from agents.llm.base import ChatResult, ToolCall
from agents.llm.openai_provider import OpenAIProvider
from agents.runner import AgentRunner
from tests.test_agents_mocked import FakeSearchTool


class FakeResponse:
    def __init__(self, body: dict, status_code: int = 200, headers: dict | None = None):
        self._body = body
        self.status_code = status_code
        self.headers = headers or {}

    def json(self):
        return self._body

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class FakeOpenAI:
    """Records every payload sent to the Responses API and replays scripted responses."""

    def __init__(self, responses: list[FakeResponse]):
        self.responses = responses
        self.payloads = []

    def post(self, url, headers=None, json=None, timeout=None):
        assert url == openai_provider.OPENAI_RESPONSES_URL
        assert headers["Authorization"] == "Bearer sk-test"
        self.payloads.append(json)
        return self.responses.pop(0)


REASONING_ITEM = {"type": "reasoning", "id": "rs_1", "summary": [], "encrypted_content": "gAAA-opaque"}


def function_call(call_id: str, name: str, args: dict) -> dict:
    return {"type": "function_call", "id": f"fc_{call_id}", "call_id": call_id, "name": name,
            "arguments": json.dumps(args), "status": "completed"}


def response(*items, usage=None) -> FakeResponse:
    return FakeResponse({"output": list(items), "usage": usage or {"input_tokens": 10, "output_tokens": 5}})


@pytest.fixture
def fake(monkeypatch):
    def install(responses):
        f = FakeOpenAI(responses)
        monkeypatch.setattr(openai_provider.requests, "post", f.post)
        monkeypatch.setattr(openai_provider.time, "sleep", lambda s: None)
        return f
    return install


SPECS = [{"name": "web_search", "description": "Search.", "parameters": {"type": "object", "properties": {}}}]


def test_request_shape(fake):
    f = fake([response({"type": "message", "content": [{"type": "output_text", "text": "hi"}]})])
    result = OpenAIProvider(api_key="sk-test", model="gpt-6-luna").chat("SYS", [{"role": "user", "content": "u"}], SPECS)

    p = f.payloads[0]
    assert p["model"] == "gpt-6-luna"
    assert p["instructions"] == "SYS"
    assert p["input"] == [{"role": "user", "content": "u"}]
    assert p["tools"] == [{"type": "function", "name": "web_search", "description": "Search.",
                           "parameters": {"type": "object", "properties": {}}, "strict": False}]
    assert p["tool_choice"] == "auto"
    assert p["store"] is False
    assert p["include"] == ["reasoning.encrypted_content"]
    assert p["reasoning"] == {"effort": "low"}
    assert result.content == "hi" and result.tool_calls == [] and result.provider_items == []


def test_force_tool_uses_responses_api_shape(fake):
    f = fake([response(function_call("c1", "submit_result", {"a": 1}))])
    OpenAIProvider(api_key="sk-test").chat("s", [{"role": "user", "content": "u"}], SPECS, force_tool="submit_result")
    assert f.payloads[0]["tool_choice"] == {"type": "function", "name": "submit_result"}


def test_parses_tool_calls_and_keeps_reasoning_items(fake):
    fake([response(REASONING_ITEM, function_call("c1", "web_search", {"query": "acme"}))])
    result = OpenAIProvider(api_key="sk-test").chat("s", [{"role": "user", "content": "u"}], SPECS)
    assert result.tool_calls == [ToolCall(id="c1", name="web_search", arguments={"query": "acme"})]
    assert result.provider_items == [REASONING_ITEM]
    assert result.content is None


def test_history_replays_reasoning_then_call_then_output(fake):
    f = fake([response({"type": "message", "content": [{"type": "output_text", "text": "ok"}]})])
    history = [
        {"role": "user", "content": "u"},
        {"role": "assistant", "content": None, "provider_items": [REASONING_ITEM],
         "tool_calls": [ToolCall(id="c1", name="web_search", arguments={"query": "acme"})]},
        {"role": "tool_result", "tool_call_id": "c1", "name": "web_search", "content": "results"},
    ]
    OpenAIProvider(api_key="sk-test").chat("s", history, SPECS)
    assert f.payloads[0]["input"] == [
        {"role": "user", "content": "u"},
        REASONING_ITEM,
        {"type": "function_call", "call_id": "c1", "name": "web_search", "arguments": json.dumps({"query": "acme"})},
        {"type": "function_call_output", "call_id": "c1", "output": "results"},
    ]


def test_retries_on_rate_limit_then_succeeds(fake):
    f = fake([
        FakeResponse({}, status_code=429, headers={"retry-after": "0"}),
        response({"type": "message", "content": [{"type": "output_text", "text": "ok"}]}),
    ])
    result = OpenAIProvider(api_key="sk-test").chat("s", [{"role": "user", "content": "u"}], SPECS)
    assert result.content == "ok"
    assert len(f.payloads) == 2


def test_non_retryable_error_raises(fake):
    fake([FakeResponse({"error": "bad key"}, status_code=401)])
    with pytest.raises(RuntimeError, match="401"):
        OpenAIProvider(api_key="sk-test").chat("s", [{"role": "user", "content": "u"}], SPECS)


def test_full_agent_loop_through_runner(fake):
    """AgentRunner + OpenAIProvider: search, then submit — reasoning from turn 1 is replayed on turn 2."""
    f = fake([
        response(REASONING_ITEM, function_call("c1", "web_search", {"query": "acme revenue"})),
        response(function_call("c2", "submit_result", {"revenue_cr": 450})),
    ])
    search = FakeSearchTool()
    runner = AgentRunner(provider=OpenAIProvider(api_key="sk-test"), tools=[search], max_steps=5)
    result = runner.run(system="s", user_message="u", output_schema={"type": "object"})

    assert result == {"revenue_cr": 450}
    assert search.calls == ["acme revenue"]
    second_input = f.payloads[1]["input"]
    assert REASONING_ITEM in second_input
    assert second_input[-1] == {"type": "function_call_output", "call_id": "c1", "output": search.response}


def test_factory_builds_openai_provider_per_tier():
    from agents.factory import build_llm_provider
    from app.config import Settings

    settings = Settings(llm_provider="openai", openai_api_key="sk-test",
                        openai_model_bulk="gpt-6-luna", openai_model_judgment="gpt-6-sol")
    bulk = build_llm_provider(settings, tier="bulk")
    judgment = build_llm_provider(settings, tier="judgment")
    assert isinstance(bulk, OpenAIProvider) and bulk.model == "gpt-6-luna"
    assert judgment.model == "gpt-6-sol"


def test_other_providers_ignore_provider_items():
    """Groq's wire format must not leak the OpenAI-only provider_items key."""
    from agents.llm.groq_provider import GroqProvider

    wire = GroqProvider(api_key="x")._to_wire_messages(
        "s", [{"role": "assistant", "content": "c", "tool_calls": [], "provider_items": [REASONING_ITEM]}]
    )
    assert wire == [{"role": "system", "content": "s"}, {"role": "assistant", "content": "c"}]


def test_chatresult_default_has_no_provider_items():
    assert ChatResult(content="x").provider_items == []
