# Fairway Company Intelligence API

Finds companies near a warehouse, enriches them with revenue data, and researches
lead signals (expansion, funding, hiring, tenders, regulatory activity, distress,
...) that indicate they may soon need more industrial/warehouse space — exposed as
a FastAPI service backed by Postgres, so it can be integrated into a CRM.

Two research stages (revenue lookup, signal research) run as LLM agents: a
tool-calling loop (`agents/runner.py`) that searches the web, reads pages, and
returns structured findings. Everything else — company discovery, business
classification, opportunity scoring — stays deterministic code, since those are
solved-by-code problems that don't need an LLM's judgment.

## Architecture

```
Google Places API (tiled hex-grid search)  →  discovery/
                ↓
Business classification (rules, AI fallback for the rest)  →  classification/
                ↓
Revenue lookup (curated table first, agent search fallback)  →  agents/revenue_agent.py
                ↓
Signal research (agent: web_search + fetch_page tool loop)  →  agents/signal_agent.py
                ↓
Opportunity scoring (deterministic, auditable)  →  scoring/fusion.py
                ↓
FastAPI  →  app/  (Postgres-backed, async jobs, webhook callbacks)
```

- **`agents/`** — the agent framework: `llm/` (provider-agnostic `LLMProvider` —
  Groq for dev/free, Bedrock or OpenAI for prod), `tools/` (`SearchTool` protocol +
  Serper implementation, page fetcher), `runner.py` (the tool-use loop, with a
  forced-submit safety net so a run always terminates), and the two task-specific
  agents (`revenue_agent.py`, `signal_agent.py`) with their prompts under `prompts/`.
- **`scoring/fusion.py`** — the opportunity-score math (signal-type fusion weights,
  regulatory-vs-distress reclassification, revenue-based sqft estimation). Kept
  deterministic on purpose: a CRM user should be able to verify a score by hand.
- **`app/`** — the FastAPI service: SQLAlchemy models + Alembic migrations,
  routers, Pydantic schemas, API-key auth.
- **`jobs/`** — async job execution (FastAPI `BackgroundTasks` + a DB-backed job
  row for status; no Celery/Redis — batch volume is ~50-500 companies, once or
  twice a year, so a distributed queue would be infra with no payoff).
- **`discovery/`** — Google Places API wrapper + hex-grid tiling (covers large
  radii without missing companies in dense clusters, since Places caps each
  call at 20 results).
- **`archive/`** — the original CSV-pipeline scripts this replaced, kept for
  reference.

## API

All endpoints require an `X-API-Key` header (see `API_KEY` in `.env`).

```
GET  /v1/companies                          list + filter (search, business_type, min_score,
                                             min/max_revenue_cr) + sort (score|recency|revenue|distance)
GET  /v1/companies/{id}                     full detail: revenue snapshots, signals, opportunity score
GET  /v1/discovery/runs/{id}                a past discovery run's stats

POST /v1/companies/{id}/revenue:research    kick off the Revenue Agent (async job)
POST /v1/companies/{id}/signals:research    kick off the Signal Research Agent (async job)
GET  /v1/jobs/{id}                          poll job status/result

  Both POST endpoints accept an optional body: {"callback_url": "https://..."}
  — if set, the job POSTs its final status/result there when done.
```

## Local setup

### Prerequisites

- Python 3.13, Docker (for local Postgres)
- API keys: Google Places API, Groq (free tier, dev LLM), Serper (web search tool)

### 1. Install dependencies

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# fill in PLACES_API, GROQ_API_KEY, SERPER_API_KEY, API_KEY
```

### 3. Start Postgres and run migrations

```bash
cd docker && docker compose up -d postgres && cd ..
alembic upgrade head
```

### 4. (First run only) import existing CSV-pipeline data

```bash
python -m scripts.import_legacy_csv
```

### 5. Run the API

```bash
uvicorn app.main:app --reload
```

Or run the whole stack (Postgres + API) in Docker:

```bash
cd docker && docker compose up -d --build
```

### 6. Run tests

```bash
pytest tests/
```

## LLM provider

Set `LLM_PROVIDER=groq` (default, free tier) for local dev, or `LLM_PROVIDER=bedrock`
or `LLM_PROVIDER=openai` for production — the switch is a config change, not a code
change, since all providers implement the same `agents/llm/base.py` interface. Bedrock credentials
come from the standard boto3 chain (env vars, `~/.aws/credentials`, or an
instance/task role); model IDs are configurable via `BEDROCK_MODEL_ID_BULK` /
`BEDROCK_MODEL_ID_JUDGMENT` in `.env` (verify against your account's enabled
model access — see `.env.example`).

OpenAI uses the Responses API (`agents/llm/openai_provider.py`) with
`OPENAI_API_KEY`; models are `OPENAI_MODEL_BULK` / `OPENAI_MODEL_JUDGMENT`
(default `gpt-6-luna` for both) and `OPENAI_REASONING_EFFORT` (default `low`).
Requests are stateless (`store: false`); the encrypted reasoning items that
reasoning models return are replayed on the next call via
`ChatResult.provider_items`. A ChatGPT subscription does not include API use —
the key needs pay-as-you-go API credits.

## Legacy Streamlit map explorer

`app.py` (ad hoc company discovery + map view, not part of the API) still works
standalone:

```bash
streamlit run app.py
```
