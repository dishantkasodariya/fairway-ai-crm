"""Drafts a LinkedIn note + first-touch email for a contact. Pure generative
synthesis over data already in our DB - no search tools needed, unlike
RevenueAgent/SignalAgent."""

from app.config import Settings
from agents.factory import build_llm_provider
from agents.prompts.outreach import SYSTEM_PROMPT, OUTREACH_OUTPUT_SCHEMA, build_user_message
from agents.runner import AgentRunner


class OutreachAgent:
    def __init__(self, settings: Settings):
        self.settings = settings

    def draft(
        self,
        contact_name: str,
        contact_title: str | None,
        company_name: str,
        why: str | None,
        estimated_requirement: str | None,
    ) -> dict:
        provider = build_llm_provider(self.settings, tier="judgment")
        runner = AgentRunner(provider=provider, tools=[], max_steps=3)
        return runner.run(
            system=SYSTEM_PROMPT,
            user_message=build_user_message(contact_name, contact_title, company_name, why, estimated_requirement),
            output_schema=OUTREACH_OUTPUT_SCHEMA,
        )
