from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://fairway:fairway@localhost:5439/fairway"

    places_api: str = ""
    groq_api_key: str = ""
    serper_api_key: str = ""

    llm_provider: str = "groq"  # "groq" (dev) or "bedrock" (prod)
    aws_region: str = "ap-south-1"
    # Verify these against your account's actual enabled Bedrock model access —
    # exact inference-profile IDs vary by region and change as AWS adds models.
    bedrock_model_id_bulk: str = "apac.anthropic.claude-haiku-4-5-20251001-v1:0"
    bedrock_model_id_judgment: str = "apac.anthropic.claude-sonnet-5-20250929-v1:0"

    groq_model_bulk: str = "openai/gpt-oss-20b"
    groq_model_judgment: str = "openai/gpt-oss-120b"

    api_key: str = "change_me"

    signals_cron_batch_size: int = 30
    signals_cron_stale_days: int = 30
    signals_cron_interval_hours: int = 24


@lru_cache
def get_settings() -> Settings:
    return Settings()
