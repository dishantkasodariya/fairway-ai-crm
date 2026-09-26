# AI Prospect Intelligence — Rebuild Plan (Phase 1 completion + Phase 2 + Phase 3)

## Repo & branch — all work lands here

- **GitHub repo**: `dishantkasodariya/fairway-ai-crm` (private; only visible under the `BhavyaBavisi20` GitHub account, not `bhavyabavisi` — `gh auth switch --user BhavyaBavisi20` before any `gh`/push operation).
- **Branch**: `feature/ai-prospect-intelligence` — already exists, already has real commits on it (see baseline below). **All new work commits directly onto this branch**, incrementally, as each slice becomes verifiably working — not batched up and left uncommitted. When the branch is in a demo-ready state, a PR gets raised to `main` for review/merge — main is never touched directly.
- **Local checkout**: `/Users/bhavya_040/fairway-ai-crm` (permanent path, not a scratchpad).
- **Local services** (already running, verified end-to-end this session):
  - Intelligence FastAPI — `localhost:8000`, DB `postgresql+psycopg2://fairway:fairway@localhost:5439/fairway` (docker container `docker-postgres-1`)
  - CRM backend — `localhost:5001`, DB `postgresql://fairway_crm:fairway_crm@localhost:5434/fairway_crm` (docker container `fairway-crm-postgres`)
  - CRM client — `localhost:5173`

## Context

A previous session built out a large chunk of this integration (revenue-enrich confirm gate, Apollo contact enrichment, outreach drafting, signals cron, and the entire AI Discovery/Connections frontend) but did the work inside a temporary scratchpad directory instead of this repo, and never committed/pushed it. That scratchpad has since been garbage-collected by the OS and is unrecoverable. The **data** survived (it lives in the two Postgres docker volumes, independent of any scratchpad), but the **code** for everything past basic discovery+per-company research is gone and needs to be rebuilt directly in this repo, this time committed incrementally so this can't happen again.

This plan is based on a fresh, verified audit of exactly what's on `feature/ai-prospect-intelligence` right now (not the old plan's assumptions) — every "already built" item below was confirmed by reading the actual committed file; every "to build" item was confirmed missing the same way.

---

## Already built & committed (verified — do not redo)

**`intelligence/` (FastAPI)**
- Models: `DiscoveryRun`, `Company`, `RevenueSnapshot`, `Signal`, `OpportunityScore`, `Job` (`app/db/models.py`). `JobType` enum = `revenue_research`, `signal_research` only.
- Endpoints: `POST /v1/discovery/runs`, `GET /v1/discovery/runs/{id}` (`app/routers/discovery.py`); `GET /v1/companies`, `GET /v1/companies/{id}` (`app/routers/companies.py`); `POST /v1/companies/{id}/revenue:research`, `POST /v1/companies/{id}/signals:research`, `GET /v1/jobs/{id}` (`app/routers/jobs.py`).
- `jobs/runner.py`: `run_revenue_research_job`, `run_signal_research_job`, single-company jobs only — no batch runner.
- Alembic head: `85dc40021423` (3 migrations total). No `apscheduler` dependency.

**`backend/` (Express, real Postgres via `pg`, real JWT auth via `bcryptjs`/`jsonwebtoken`, `express-rate-limit`, `helmet`)**
- Full CRM already in place: companies, contacts, inquiries, `pipeline_stages` (10 stages: `new → contacted → requirement_confirmed → property_matched → property_shared → proposal → site_visit → negotiation → won/lost`, table confirmed with real rows), proposals, site-visits, tasks, facilities, properties, notifications, notes, audit, permissions/roles, calls, communications, documents, followups, CSV import.
- `intelligence.controller.ts` / `intelligence.routes.ts` already proxy: start/get discovery run, list/get discovered companies, per-company revenue-research, per-company signals-research, get job. No batch revenue-enrich, no business-types, no contacts, no outreach.
- `companies` table already has a `source VARCHAR(50) DEFAULT 'Manual'` column (`db.ts`), and `inquiries` already has `source VARCHAR(100) DEFAULT 'Direct'` — but `companies.controller.ts` never reads/writes `source` in its select/insert code, so it's a dead column right now.

**`client/` (React/Vite)**
- Full CRM modules present (companies, contacts, inquiries, pipeline, proposals, site-visits, tasks, dashboard, import-export, map, etc.).
- `core/services/intelligenceService.ts` already has client methods matching the committed Phase-1 backend endpoints above.
- `properties/components/AiProspectsPanel.tsx` exists (search + poll + results list on a Property's detail page) but its "Add to CRM" handler (`handleAddToCrm`) only calls `CompanyService.createCompany` + `FacilityService.createFacility` — **no Inquiry is created**, so an added prospect never reaches the Pipeline Kanban (which reads only `inquiries.stage`).
- No `client/src/modules/intelligence/` folder at all — no AI Discovery page, no detail page, no Connections page.
- Reusable UI confirmed present for the new pages: `core/components/ui/CommonDataGrid.tsx`, `combobox-1.tsx`, `Badge.tsx`.

---

## Real bugs found in currently-committed code (fix as part of this work, not separately)

1. **`backend/src/controllers/inquiries.controller.ts`, `createInquiry`** (~line 786–787): `b.leadScore || 85` and `b.opportunityScore || 90` — `||` discards a real score of `0`, silently replacing it with the hardcoded default. Fix: `??`.
2. **`backend/src/controllers/import.controller.ts`, `bulkImportInquiries`**: `ColumnMapping` interface has no `opportunityScore`/`leadScore`/`annualTurnover`/`source` fields at all; the INSERT hardcodes `85, 90` (~line 291) and never maps a `source` column. This is the actual CSV pipeline-conversion path from the plan below — must be patched for AI-sourced leads to carry their real score on import.
3. **`backend/src/controllers/notifications.controller.ts`**: `createNotification`/`getNotifications`/`markAsRead`/`markAllAsRead` insert into and select `"userId"`, `"isRead"`, `"createdAt"` (quoted camelCase) unconditionally, but the real `notifications` table only has `user_id`, `is_read`, `created_at` (snake_case) — confirmed live right now: backend logs show `Failed to insert default notification row: column "userId" of relation "notifications" does not exist` on every backend boot. This must be fixed before Phase 2's cron can create any real `ai_signal` notification.
4. **`backend/src/config/db.ts`, `initDatabase()`**: unconditional `ALTER TABLE users ALTER COLUMN "createdAt"...` for a legacy camelCase column that doesn't exist on this schema — **already fixed** this session (commit `997b590`), included here only so the fix isn't reverted.
5. **`companies.controller.ts`**: doesn't read/write `source` on `getCompanies`/`getCompanyById`/`createCompany` even though the column exists — needed so AI-sourced companies can be visually distinguished (badge) and counted (dashboard tile).

---

## Phase 1 completion — AI Discovery page, revenue-enrich gate, CSV path, end-to-end pipeline wiring

### Backend (Python, `intelligence/`)
- `DiscoveryRun` gets `revenue_enrichment_status` (`not_started`/`running`/`done`) and `revenue_enriched_count` columns — new Alembic migration.
- `app/routers/discovery.py`: `POST /v1/discovery/runs/{id}/enrich-revenue` — background task, small thread pool (3–5 concurrent), loops companies in that run without a revenue snapshot, calls the existing `run_revenue_research_job` logic, increments `revenue_enriched_count` atomically. Bounded by the run's own company count (tens, not hundreds) — no separate rate cap needed here (unlike Phase 2's always-on cron, which does need one).
- `app/routers/companies.py`: `GET /v1/companies/business-types` (distinct type + count, for a filter dropdown) — must be registered before `/{company_id}` or it'll be swallowed by the path param route.

### Backend (Node, `backend/`)
- `intelligence.controller.ts`/`intelligence.routes.ts`: add proxy handlers for `enrich-revenue` and `business-types`, same `callIntelligenceApi` pattern as the existing 7 handlers.
- Apply bug fixes #1, #2, #5 above.
- `AiProspectsPanel.tsx`'s "Add to CRM" gets extended (see below) to also call `InquiryService.createInquiry` — needs a real payload matching what `createInquiry` expects (see fix #1's function for the exact field list), `stage: 'new'`, `source: 'AI Discovery'`, priority tiered from the real opportunity score.

### Frontend (`client/`)
- New `client/src/modules/intelligence/` module:
  - `pages/AiDiscoveryPage.tsx` — location/coords + radius search → `IntelligenceService.startDiscoveryRun`, poll to completion (reuse `AiProspectsPanel.tsx`'s existing poll pattern) → revenue-enrich confirm banner → `CommonDataGrid` results table (search/business-type/min-score/sort filters, row click → detail) → row-selection CSV export.
  - `pages/AiProspectDetailPage.tsx` — revenue history, signals timeline, opportunity score breakdown, "Add to CRM" (Company + Facility + **Inquiry**, fixing the pipeline gap), single-row CSV download.
  - `utils/exportProspectsCsv.ts` — builds a CSV using the Import Wizard's recognized headers (`Company`, `Industry`, `Comments`) plus the two new ones import.controller.ts will now recognize (`Opportunity Score`, `Revenue (Cr)`), `Remark 1 – Current Status` = `"New — AI Discovered"` so `mapStatusToStage` lands it in `new`.
- Nav: two new items in `AppShell.tsx` (`AI Discovery`, `AI Connections`, `Sparkles` icon), view IDs/routes in `RouterContext.tsx` (`ai_discovery`, `ai_prospect_detail`, `ai_connections`), matching `case` blocks in `App.tsx`.
- Visibility badges: a small "AI" `Badge` next to company name wherever `source === 'AI Discovery'` — `CompaniesPage.tsx`, `InquiriesPage.tsx`, both Kanban card variants in `PipelinePage.tsx`.
- Dashboard: 3 new stat tiles (Hot AI Prospects, Companies Discovered, AI-Sourced Leads) in `DashboardPage.tsx`, styled to match the existing KPI tile grid, using `IntelligenceService.listDiscoveredCompanies` + an `inquiries.source === 'AI Discovery'` filter.

### Verification
- `pytest` in `intelligence/`; `tsc --noEmit` in `backend/` and `client/`.
- Real search (small radius) → revenue-enrich banner → confirm → watch progress → "Add to CRM" on one result → confirm it appears on the Pipeline board's `New Lead` column with its real opportunity score (not 85/90) → export CSV → run it through the actual Import Wizard UI → confirm the imported inquiry also lands in `new` with the real score intact.

---

## Phase 2 — Signals cron + notifications (build after Phase 1 is verified)

- **Python**: `jobs/scheduler.py` — `APScheduler` `BackgroundScheduler`, started from a FastAPI startup event in `app/main.py`. Nightly batch (env-configurable, default small e.g. 30/night — the guardrail): never-researched companies first, then stalest by `OpportunityScore.computed_at`, using the existing `run_signal_research_job`. Add `apscheduler` to `requirements.txt`, add `signals_cron_batch_size`/`signals_cron_stale_days`/`signals_cron_interval_hours` to `app/config.py`.
- **Node**: `backend/src/jobs/aiSignalsWatcher.ts`, `node-cron` (new dep, `package.json`), hourly: `GET /api/intelligence/companies?sortBy=recency&limit=50`, diff against a watermark in the existing `system_metadata` table (`key = 'ai_signals_last_notified_at'`), insert a notification for any company newly crossing "hot" (score ≥ 70) — **only after bug fix #3 above is in**, otherwise every insert fails silently. Wire `startAiSignalsWatcher()` into `server.ts`, gated on `config.intelligenceApiUrl` being set.
- Add `'ai_signal'` to the `NotificationType` union in `client/src/modules/core/types/index.ts` + a `Sparkles` icon case wherever notification icons are switched on type.

---

## Phase 3 — AI Connections: Apollo contacts + outreach drafts (build after Phase 2)

- **Python**: `Contact` model (company FK, name, title, email, phone, linkedin_url, source, confidence) + `OutreachDraft` model (contact FK, channel enum `linkedin`/`email`, content, generated_at) + Alembic migration. `agents/enrichment/apollo_client.py` — plain REST wrapper against Apollo People Search/Match (flag early if the configured Apollo key is still Free-tier — it was confirmed blocked from People Search/Match last time, Org Enrichment only works — check before building the UI around it). `POST /v1/companies/{id}/contacts:enrich` (BackgroundTasks Job, same shape as revenue/signals), `GET /v1/companies/{id}/contacts`. `POST /v1/contacts/{id}/draft-message` — one `AgentRunner` call producing a LinkedIn note + email subject/body from the company's opportunity score `why`/`estimatedRequirement`.
- **Node**: proxy handlers in `intelligence.controller.ts`/routes for contacts + drafts, same pattern.
- **Frontend**: `client/src/modules/intelligence/pages/AiConnectionsPage.tsx` — table of enriched contacts across companies, per-row LinkedIn/email icon → modal with the drafted message, "Copy" + "Open LinkedIn Profile" / "Open in Email Client" — **no send button, manual send only**, by explicit design (ToS/ban risk for automated LinkedIn, no ESP configured for automated email).

---

## Sequencing

Phase 1 completion first (it's the highest-value gap — without it, AI leads still can't reach the Pipeline board, which was the original ask). Fix the 3 real bugs as part of that work, not separately, since Phase 1 and Phase 2 both depend on fix #1/#2/#3 respectively. Phase 2 next (signals cron), Phase 3 last (Apollo — depends on confirming the API key tier first). Commit after each independently-working slice (e.g. "revenue-enrich endpoint + migration" is one commit, "AI Discovery page" is another), not one giant commit at the end.
