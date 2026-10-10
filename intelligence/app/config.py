from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://fairway:fairway@localhost:5439/fairway"

    # Set ENVIRONMENT=production on the real deployment — gates the dev API-key
    # bypass in app/deps.py. Defaults to dev-like behavior everywhere else.
    environment: str = "development"

    # Rehearsal/testing only: fake Places + LLM + research agents (testing/fake_providers.py).
    # The service refuses to start with this on when ENVIRONMENT=production.
    fake_providers: bool = False

    places_api: str = ""
    groq_api_key: str = ""
    serper_api_key: str = ""

    llm_provider: str = "groq"  # "groq" (dev), "bedrock" or "openai" (prod)
    # Hard cap on every LLM call's output (+ reasoning tokens, for reasoning models) —
    # bounds cost/latency per call regardless of provider. Tool-call JSON and the
    # short "continue researching" turns never need anywhere near this; it's a
    # runaway-generation backstop, not a working limit.
    llm_max_output_tokens: int = 4096
    aws_region: str = "ap-south-1"
    # Verify these against your account's actual enabled Bedrock model access —
    # exact inference-profile IDs vary by region and change as AWS adds models.
    bedrock_model_id_bulk: str = "apac.anthropic.claude-haiku-4-5-20251001-v1:0"
    bedrock_model_id_judgment: str = "apac.anthropic.claude-sonnet-5-20250929-v1:0"

    groq_model_bulk: str = "openai/gpt-oss-20b"
    groq_model_judgment: str = "openai/gpt-oss-120b"

    # OpenAI (LLM_PROVIDER=openai) — Responses API. GPT-6 Luna for both tiers keeps cost
    # lowest; set OPENAI_MODEL_JUDGMENT=gpt-6-sol for stronger outreach drafts.
    openai_api_key: str = ""
    openai_model_bulk: str = "gpt-6-luna"
    openai_model_judgment: str = "gpt-6-luna"
    openai_reasoning_effort: str = "low"

    api_key: str = "change_me"

    signals_cron_batch_size: int = 30
    signals_cron_stale_days: int = 30
    signals_cron_interval_hours: int = 24

    apollo_api_key: str = ""

    # Intelligence pipeline (jobs/run_pipeline.py)
    # Parallel research agents. Free/low LLM tiers rate-limit hard (Groq free: keep 1-2);
    # a paid OpenAI tier can take 6-10. Each agent makes several LLM + search calls.
    llm_concurrency: int = 2
    signals_batch_size: int = 100
    signals_max_per_run: int = 0  # 0 = every suitable company, batch after batch
    contacts_top_n: int = 25
    # Business-type fit for a warehouse-leasing business. Primary first, secondary next,
    # anything else is skipped (no revenue/signals spend). Comma-separated in .env.
    suitable_business_types_primary: str = (
        "Chemicals,Pharma/Life Sciences,Plastics/Packaging,Agrochemicals/Fertilizer,"
        "Shipping/Logistics/Transport,Food/Beverage,Automobile/Auto Parts,Electronics/Electrical,Textile"
    )
    suitable_business_types_secondary: str = (
        "Metal/Engineering/Fabrication,Paper/Board,Rubber,Edible Oil,Solar/Renewable Energy,"
        "Ceramics/Tiles,Cement/Construction Materials,Leather,Flour/Grain Mill"
    )

    @field_validator(
        "openai_model_bulk", "openai_model_judgment", "openai_reasoning_effort",
        "suitable_business_types_primary", "suitable_business_types_secondary",
        mode="before",
    )
    @classmethod
    def _blank_means_default(cls, v, info):
        # An empty line in .env (OPENAI_MODEL_BULK=) keeps the built-in default instead of "".
        if isinstance(v, str) and not v.strip():
            return cls.model_fields[info.field_name].default
        return v

    def business_type_tiers(self) -> dict[str, float]:
        """business type -> fit weight (1.0 primary, 0.6 secondary)."""
        tiers = {t.strip(): 0.6 for t in self.suitable_business_types_secondary.split(",") if t.strip()}
        tiers.update({t.strip(): 1.0 for t in self.suitable_business_types_primary.split(",") if t.strip()})
        return tiers

    log_level: str = "INFO"
    otel_enabled: bool = True
    otel_service_name: str = "fairway-intelligence"
    # Jaeger's OTLP/HTTP receiver, already running locally (asaya-jaeger, ports 4318/16686).
    # Point this at a reachable OTLP collector for staging/prod.
    otel_exporter_otlp_endpoint: str = "http://localhost:4318"


@lru_cache
def get_settings() -> Settings:
    return Settings()
