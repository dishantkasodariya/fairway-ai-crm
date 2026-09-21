"""
Lead-signal research: replaces the manual WebSearch-subagent fanout with a
single AgentRunner-driven tool loop per company.
"""

from app.config import Settings
from agents.factory import build_llm_provider
from agents.prompts.signals import SIGNAL_OUTPUT_SCHEMA, SYSTEM_PROMPT, build_user_message
from agents.runner import AgentRunner
from agents.tools.fetch_tool import PageFetchTool
from agents.tools.search_tool import SerperSearchTool


class SignalAgent:
    def __init__(self, settings: Settings):
        self.settings = settings

    def research(self, name: str, address: str = "", business_type: str | None = None) -> dict:
        provider = build_llm_provider(self.settings, tier="bulk")
        tools = [SerperSearchTool(api_key=self.settings.serper_api_key), PageFetchTool()]
        runner = AgentRunner(provider=provider, tools=tools, max_steps=14)

        result = runner.run(
            system=SYSTEM_PROMPT,
            user_message=build_user_message(name, address, business_type),
            output_schema=SIGNAL_OUTPUT_SCHEMA,
        )
        return {
            "signals": result.get("signals", []),
            "estimated_sqft": result.get("estimated_sqft", ""),
        }
