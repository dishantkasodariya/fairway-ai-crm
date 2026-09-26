# Fairway AI CRM — repo guide

Monorepo: AI company-discovery/intelligence engine + the Fairway CRM it feeds leads into.

- **Repo**: `dishantkasodariya/fairway-ai-crm` (private — only visible under the `BhavyaBavisi20` GitHub account; run `gh auth switch --user BhavyaBavisi20` before any `gh`/push operation on this repo).
- **Active branch**: `feature/ai-prospect-intelligence`. All work happens here, committed incrementally as each piece works — never left uncommitted "for later." Never push to / merge into `main` directly; raise a PR when the branch is in a reviewable state and let the repo owner merge it.
- **Current plan / in-flight work**: see `PLAN.md` in this repo root. Read it before starting work — it lists exactly what's already built vs. what's still missing, with file-level detail, so you don't have to re-derive it by exploring.

## Structure

```
intelligence/   FastAPI + SQLAlchemy + Alembic — company discovery, classification, revenue research, signals, opportunity scoring
backend/        Express + pg (raw SQL, no ORM) — the actual CRM (companies, contacts, inquiries, pipeline, proposals, site visits, tasks, ...) + a proxy layer into intelligence/
client/         React + Vite + TanStack Table — the CRM frontend
docs/           reference docs (API spec, HLD/LLD, knowledge transfer)
```

## Local dev setup

Two separate Postgres instances, on non-conflicting ports, each in its own Docker container/volume so they survive container restarts:

| Service | Port | Container | DB | User/Pass |
|---|---|---|---|---|
| Intelligence DB | 5439 | `docker-postgres-1` (from `intelligence/docker/docker-compose.yml`) | `fairway` | `fairway`/`fairway` |
| CRM DB | 5434 | `fairway-crm-postgres` | `fairway_crm` | `fairway_crm`/`fairway_crm` |

Bring them up if not running:
```bash
cd intelligence && docker compose -f docker/docker-compose.yml up -d postgres
docker start fairway-crm-postgres   # if it already exists; otherwise see backend/.env.example for a fresh one
```

Env files (none of these are committed — copy from `.env.example` in each folder and fill in):
- `intelligence/.env` — needs `PLACES_API`, `GROQ_API_KEY`, `DATABASE_URL=postgresql+psycopg2://fairway:fairway@localhost:5439/fairway`, `API_KEY` (shared secret the CRM backend sends as `X-API-Key`).
- `backend/.env` — `PORT=5001` (5000 is squatted by macOS AirPlay/ControlCenter — always use 5001 locally), `DATABASE_URL=postgresql://fairway_crm:fairway_crm@localhost:5434/fairway_crm?schema=public`, `JWT_SECRET`, `INTELLIGENCE_API_URL=http://localhost:8000`, `INTELLIGENCE_API_KEY` (must match intelligence's `API_KEY`).
- `client/.env` — `VITE_API_URL=http://localhost:5001/api`.

Install + run each service:
```bash
# intelligence (reuses the standalone map-companies repo's venv for convenience — no separate venv here)
cd intelligence && source /Users/bhavya_040/map-companies/venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --port 8000

# backend
cd backend && npm install && npm run dev   # nodemon, watches src/**/*

# client
cd client && npm install && npm run dev
```

Test login (real seeded user, real JWT, real Postgres — not a mock): `amit@fairway.co.in` / `fairway123`.

## Ground truth you should not re-derive

- The Pipeline Kanban board reads **only** `inquiries.stage` — a `companies` row alone never appears on it. `pipeline_stages` table has exactly 10 rows/keys: `new → contacted → requirement_confirmed → property_matched → property_shared → proposal → site_visit → negotiation → won/lost`.
- CSV bulk import path is `POST /api/import/inquiries` (`backend/src/controllers/import.controller.ts`), driven by client-side-parsed rows + a column-mapping object — not a server-side file upload.
- `companies.source` and `inquiries.source` columns already exist in the DB schema (`db.ts`), defaulting to `'Manual'`/`'Direct'` — but not every controller reads/writes them yet (check `PLAN.md`'s bug list before assuming a controller exposes `source`).
- Apollo.io API key on file was confirmed **Free-tier and blocked from People Search/Match** (`API_INACCESSIBLE`) — only Organization Enrichment works. Re-verify this before building anything Phase-3/Apollo-contacts related; don't assume it still holds without checking, but don't assume it's fixed either.

## Working rules for this repo specifically

- Commit each independently-working slice as its own commit on `feature/ai-prospect-intelligence` — do not batch multiple features into one uncommitted working tree and "ask about committing" at the end. A prior session did exactly that inside a temp scratchpad instead of this repo, and lost a substantial amount of unpushed work when the scratchpad was garbage-collected between sessions. Don't repeat that.
- Verify claims against the live DB/API before reporting something as broken or fixed (`docker exec ... psql`, `curl` with a real JWT) — several "already fixed" assumptions carried over from an earlier summary turned out to be wrong once actually checked against this repo.
