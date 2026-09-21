"""
AI fallback for companies classification.rules.classify() can't place (rules
handle the large majority for free). Replaces classify_with_grok.py — a
short tool-assisted classification, not a full research loop.
"""

from app.config import Settings
from agents.factory import build_llm_provider
from agents.runner import AgentRunner
from agents.tools.fetch_tool import PageFetchTool
from agents.tools.search_tool import SerperSearchTool
from classification.rules import CATEGORY_RULES

CATEGORIES = [c for c, _ in CATEGORY_RULES] + ["Other"]

CLASSIFY_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": CATEGORIES},
        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
        "reason": {"type": "string"},
    },
    "required": ["category", "confidence", "reason"],
}

SYSTEM_PROMPT = f"""Classify this Indian company into exactly one of these categories:
{", ".join(CATEGORIES)}.

If a website is given, use fetch_page once to check what it actually makes/does. If not,
or that's inconclusive, use web_search once. Then call submit_result — don't research
more than twice total, a confident guess beats an exhaustive search here.
"""


class AIFallbackClassifier:
    def __init__(self, settings: Settings):
        self.settings = settings

    def classify(self, name: str, address: str = "", website: str | None = None) -> dict:
        provider = build_llm_provider(self.settings, tier="bulk")
        tools = [PageFetchTool(), SerperSearchTool(api_key=self.settings.serper_api_key)]
        runner = AgentRunner(provider=provider, tools=tools, max_steps=4)

        user_message = f"Company: {name}\nAddress: {address}\nWebsite: {website or 'unknown'}"
        return runner.run(system=SYSTEM_PROMPT, user_message=user_message, output_schema=CLASSIFY_OUTPUT_SCHEMA)
