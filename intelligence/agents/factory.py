from typing import Literal

from app.config import Settings
from agents.llm.base import LLMProvider
from agents.llm.groq_provider import GroqProvider

# "bulk": the search/extract grind (most agent steps) — optimize for cost.
# "judgment": reconciling conflicting numbers, final synthesis — optimize for accuracy.
Tier = Literal["bulk", "judgment"]


def build_llm_provider(settings: Settings, tier: Tier = "bulk") -> LLMProvider:
    if settings.llm_provider == "groq":
        model = settings.groq_model_bulk if tier == "bulk" else settings.groq_model_judgment
        return GroqProvider(api_key=settings.groq_api_key, model=model)
    if settings.llm_provider == "bedrock":
        from agents.llm.bedrock_provider import BedrockProvider  # deferred: boto3 only needed in prod

        model_id = settings.bedrock_model_id_bulk if tier == "bulk" else settings.bedrock_model_id_judgment
        return BedrockProvider(region=settings.aws_region, model_id=model_id)
    if settings.llm_provider == "openai":
        from agents.llm.openai_provider import OpenAIProvider

        model = settings.openai_model_bulk if tier == "bulk" else settings.openai_model_judgment
        return OpenAIProvider(
            api_key=settings.openai_api_key, model=model, reasoning_effort=settings.openai_reasoning_effort
        )
    raise ValueError(f"Unknown LLM_PROVIDER: {settings.llm_provider!r}")
