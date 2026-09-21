"""
Revenue research: check the curated reference table first (free, instant,
highest trust), fall back to an AgentRunner-driven web search otherwise.
Replaces find_revenue.py's Groq-search path.
"""

from app.config import Settings
from agents.factory import build_llm_provider
from agents.prompts.revenue import SYSTEM_PROMPT, REVENUE_OUTPUT_SCHEMA, build_user_message
from agents.reference_data import (
    build_reference_index,
    find_reference_match,
    parse_reference_table,
    parse_revenue_cr,
)
from agents.runner import AgentRunner
from agents.tools.fetch_tool import PageFetchTool
from agents.tools.search_tool import SerperSearchTool

REFERENCE_TABLE_PATH = "data/company_revenue_reference.md"


class RevenueAgent:
    def __init__(self, settings: Settings, reference_table_path: str = REFERENCE_TABLE_PATH):
        self.settings = settings
        records = parse_reference_table(reference_table_path)
        self._reference_index = build_reference_index(records)

    def _try_reference_table(self, name: str) -> dict | None:
        match = find_reference_match(name, self._reference_index)
        if match is None:
            return None
        record, score = match
        return {
            "revenue": record["revenue"],
            "revenue_cr": parse_revenue_cr(record["revenue"]),
            "fiscal_year": record["fiscal_year"],
            "source_name": record["source_name"],
            "source_url": record["source_url"],
            "method": "reference_table",
            "confidence": "high" if score >= 0.9 else "medium",
        }

    def research(self, name: str, address: str = "", website: str | None = None) -> dict:
        ref_hit = self._try_reference_table(name)
        if ref_hit is not None:
            return ref_hit

        provider = build_llm_provider(self.settings, tier="bulk")
        tools = [SerperSearchTool(api_key=self.settings.serper_api_key), PageFetchTool()]
        runner = AgentRunner(provider=provider, tools=tools, max_steps=8)

        result = runner.run(
            system=SYSTEM_PROMPT,
            user_message=build_user_message(name, address, website),
            output_schema=REVENUE_OUTPUT_SCHEMA,
        )
        return {
            "revenue": result.get("revenue_display") or None,
            "revenue_cr": result.get("revenue_cr"),
            "fiscal_year": result.get("fiscal_year") or None,
            "source_name": result.get("source_name") or None,
            "source_url": result.get("source_url") or None,
            "method": "agent",
            "confidence": result.get("confidence") or "low",
        }
