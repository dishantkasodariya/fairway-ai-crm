# PLAN — Lead-to-Lease: CRM + intelligence working end to end

Previous plan (AI prospect intelligence, all 13 slices done): `docs/archive/PLAN_ai_prospect_intelligence.md`.
Design rationale with a worked example: https://claude.ai/artifact/3CCE7Wy1SHdrppUuqEUc6z

## Goal

One chain: **Warehouse → Company → Deal → Lease → back to the Warehouse**.
- The intelligence layer finds and scores companies near each Fairway warehouse.
- The CRM gives the team a daily list of who to contact and a follow-up loop (log a touch → ask "what's the update?" 5 days later).
- A signed lease reduces the warehouse's free space automatically.
- Lease end dates become renewal leads.
- The dashboard proves which wins the AI sourced.

## Decisions (confirmed by Bhavya, 2026-10-01)

| Topic | Decision |
|---|---|
| Real warehouses | **One** today, the discovery anchor at `21.4779173, 72.7234733` (Olpad / Kim area, Surat district). There's no other warehouse or tenant data yet. The 3 seeded properties (Dahej, Sanand, Surat Hazira) are demo data. Leave them untouched: don't delete them without asking. |
| Contacts | Manual entry now, Apollo People Search once the plan is upgraded (the key is free tier; people/match returns 403 `API_INACCESSIBLE`). |
| Today list | One shared list; every item shows who should act on it. |
| Today list scope | Both: new hot AI prospects not in the CRM **and** follow-ups/deals already in it. A person still clicks Add to CRM. |
| Owner of a new prospect | The manager of the nearest warehouse (new `manager_user_id` on properties). Fall back to "Unassigned". |
| Space holds | From Proposal Sent. Released on Lost / Rejected / Expired, or after 30 days with no activity on the lead. |
| Space granularity | Total area (sq ft), not units/bays. |
| No-reply rule | 3 touches, 5 days apart, with no reply → lead **parked** and brought back in 90 days (or sooner if a new signal appears). |
| Prospect warehouse details | Live in an earlier artifact; imported in Phase D. |

## Ground truth found while planning (verified against code + live DB)

- `inquiry_stage_history` exists (`backend/src/config/db.ts:1031`) but **nothing writes to it**.
- `createProposal` sets `stage='proposal_sent'` and `updateProposalStatus('Accepted')` sets `stage='deal_won'` (`backend/src/controllers/proposals.controller.ts:238`, `:281`). Neither key is in `pipeline_stages` (`proposal`, `won`), so those inquiries fall off the Kanban board.
- Marking Won/Lost from `InquiryDetailPage.tsx:291/:305` drops the won_*/lost_* data. Only `PipelinePage.tsx` (via `WonCelebrationModal` / `LostReasonModal`) saves it properly.
- `properties.available_area_sq_ft` is typed by hand (`NewPropertyPage.tsx:757`). It's read in 12+ client places and in `propertyMatcher.ts:40`.
- "Tasks & Follow-ups" (`client/src/modules/tasks/pages/TasksPage.tsx`) only uses the **`tasks`** table. `follow_ups` + `FollowUpService` are unused. Notifications already sync followup_due/overdue from `tasks` (`notifications.controller.ts` `syncRealTimeNotifications`). **So the follow-up loop is built on `tasks`, not `follow_ups`** (this changes what the design page said, because `tasks` is what the UI and notifications already use). The touch log goes in `activities` (already used by 4 controllers, has `metadata` jsonb).
- `addProspectToCrm.ts` never checks for an existing CRM company, sets no salesperson and no contact name/email. The prospect page's "Added" state is local only.
- Intelligence: `discovery_runs` stores raw lat/lng only. `discovery_runner.py:52-86` skips an existing place_id without recording the new run/warehouse or distance. There's no manual create-contact endpoint. Alembic head is `8c31b6448be6`.
- Backend schema changes go in `initDatabase` (`CREATE TABLE IF NOT EXISTS`, before `runAllSchemaFixes()` at `db.ts:1275`) and columns in the `queries` array of `migrate_all_schemas.ts`. Crons follow `backend/src/jobs/aiSignalsWatcher.ts` (node-cron, wired in `server.ts` after `initDatabase`).

## Working rules (from CLAUDE.md)

Each step below = one commit on `feature/ai-prospect-intelligence`. A step is done only when it's tested against the live DBs/API and, for UI, clicked through in the browser. Run `tsc --noEmit` on backend + client for every TS change. Run `alembic upgrade`/`downgrade`/`upgrade` round-trips for every migration.

---

## Phase A — Warehouses & space (foundation)

**A1. Real warehouse + manager field**
- `properties`: add `manager_user_id`, `manager_name`, `baseline_occupied_sq_ft` (occupied by tenants not yet entered as leases).
- Create the real warehouse through the API: name "Fairway Warehouse – Olpad (Surat)" (working name), lat/lng above, manager Amit Patel.
- Total area isn't known yet. Store 0 and show "area not set" in the UI (never treat it as full). Bhavya fills it in via the edit form.
- Test: GET /api/properties shows it with coordinates and manager; the demo rows are unchanged.

**A2. Leases + holds + calculated free space**
- New tables:
  - `leases` (id, inquiry_id, company_id/name, property_id/name, area_sq_ft, rent_per_sq_ft_inr, monthly_rent_inr, start_date, end_date, tenure_years, lock_in_months, escalation_percent, status active|ended|terminated, notes, created_by)
  - `space_holds` (id, inquiry_id, proposal_id, property_id, area_sq_ft, status active|released|converted, reason, created_at, released_at)
- New `backend/src/services/spaceService.ts` `recalculatePropertySpace(propertyId)`: `available = max(0, total − baseline − Σ active leases − Σ active holds)`, written to `available_area_sq_ft`. That way every existing reader keeps working.
- One-time backfill: `baseline_occupied_sq_ft = total − available` for existing rows, so no displayed number changes.
- Properties API also returns `leasedAreaSqFt`, `heldAreaSqFt`, `baselineOccupiedSqFt`.
- Test: the demo properties' available numbers are identical before/after; SQL checks on the formula.

**A3. Leases API + UI on the warehouse**
- `/api/leases` CRUD, plus filters by property/company. Every create/end/delete recalculates space.
- Property detail page: occupancy bar (leased / on hold / free) + leases table.
- Edit form: available area becomes read-only (calculated); "occupied by existing tenants" becomes editable.
- Test: add a lease in the UI → free space drops; end it → comes back.

**A4. Won = lease, and stage history**
- `WonCelebrationModal` collects lease terms (area, rent/sq ft, start date, tenure, lock-in, escalation), pre-filled from the inquiry's latest proposal. Saving creates the lease.
- `InquiryDetailPage` uses the same Won/Lost modals as the Pipeline, so no data is dropped.
- `updateInquiry` writes `inquiry_stage_history` whenever the stage changes.
- Fix the proposal stage keys (`proposal_sent` → `proposal`, `deal_won` → `won`) and repair existing rows.
- Test: win a deal from the Pipeline and from the detail page → lease row, space drops, history rows, the card stays on the board.

**A5. Space holds + capacity check**
- Creating a proposal creates a hold (proposed area at the proposed property).
- Rejected / Expired proposal, or Lost inquiry → hold released.
- Lease created → hold converted.
- `GET /api/properties/capacity?areaSqFt=` → warehouses that fit, plus split suggestions. Shown on the inquiry once the required area is set.
- Test: proposal → free space drops by the held amount; reject → it comes back; a 2,00,000 sq ft requirement shows "no single warehouse fits" with the split options.

## Phase B — The daily loop

**B1. Touch logging + 5-day re-ask** (on `tasks` + `activities`)
- `POST /api/inquiries/:id/touches` {channel: Call|Email|LinkedIn|WhatsApp|Meeting, note, outcome: no_reply|interested|not_now|not_interested}. It:
  - writes an `activities` row (type `Touch`, touch number in metadata)
  - completes any open follow-up task for the inquiry and creates the next one: +5 days, or +90 days for not_now
  - moves `new` → `contacted` on the first touch
  - moves interested → `requirement_confirmed`
  - not_interested → opens the Lost flow
  - on the 3rd consecutive no_reply → status `Parked`, next follow-up +90 days
- `inquiries.next_follow_up_date` is kept in sync.
- Test: API sequence against the live DB covering every outcome.

**B2. "I followed up" UI**
- Button + modal on the inquiry detail page and the pipeline card menu.
- Touch timeline on the inquiry detail page.
- The Tasks page shows outcome notes; fix `toggleTaskStatus` dropping `completedNotes`.
- Test: browser click-through.

**B3. Manual contacts + Add to CRM that doesn't duplicate**
- Intelligence: `POST /v1/companies/{id}/contacts` (source `manual`) + a proxy.
- Contacts section on the AI prospect page: list, add, draft message (existing agent).
- Add to CRM:
  - reuses an existing CRM company matched on normalized name/website instead of creating a duplicate
  - copies the chosen contact onto the inquiry and a CRM contact
  - sets the salesperson to the warehouse manager
- The prospect page shows "In CRM → open lead" based on real data.
- Test: add the same prospect twice → one company, a second inquiry only if confirmed; the contact flows through.

**B4. Today list**
- `GET /api/today` returns, in order:
  1. overdue/due follow-up tasks
  2. stuck deals (stage ≥ contacted, no touch/stage change in 14 days)
  3. holds with no activity for 25+ days (about to auto-release)
  4. up to 5 hot new prospects (score ≥ 70, not in CRM), with the suggested warehouse and owner
  5. leases ending within 12 months
- A "Today" page as the first nav item.
- Daily 08:00 cron: one notification per user with their count, plus auto-release of holds idle for 30 days.
- Test: seeded scenarios appear in the right sections; the cron function run directly creates notifications idempotently.

**B5. AI Discovery search fix**
- Debounce the search box and ignore stale responses (the "chem" → 481 rows race).
- Test: typing "chem" shows 110.

## Phase C — Many warehouses, no duplicates (intelligence)

**C1. Link discovery to warehouses**
- Alembic migration:
  - `discovery_runs.property_id` (CRM property id)
  - `company_warehouse_links` (company_id, property_id, discovery_run_id, distance_km, unique company+property)
- Backfill run 1 → the Olpad warehouse, and link all 822 companies with their distance.
- Test: upgrade/downgrade round-trip; 822 links.

**C2. Discovery upserts links instead of dropping them**
- `discovery_runner.py`: an existing place_id gets a new link (warehouse + distance). Create-run takes `property_id`.
- The list API filters by warehouse and returns the nearest warehouse + distance.
- Test: a run around a second point that overlaps → existing companies gain a second link, no duplicate rows.

**C3. Discovery UI by warehouse**
- The AI Discovery search picks a warehouse (dropdown of properties with coordinates) instead of typing lat/lng. Add a warehouse filter to the list.
- Test: browser.

**C4. One account for many sites**
- `companies.parent_company_id`.
- Grouping job on exact normalized name (strip legal/unit/gate/site suffixes) + website domain. Conservative: ambiguous groups (e.g. different L&T entities) stay separate.
- List shows parents with a site count; signals cron skips child sites.
- Test: Reliance ×3, UltraTech, JK Lakshmi ×5, Aether ×3 each show as one account; L&T's distinct companies stay separate.

**C5. Scheduled discovery per warehouse**
- Monthly CRM cron calls intelligence discovery for each active warehouse with coordinates.
- **Off by default** (`DISCOVERY_CRON_ENABLED=false`) because every run spends Google Places API credits. Bhavya turns it on.
- Signals batch prefers never-scored companies nearest a warehouse.
- Test: run the job function directly with the flag on, against one small radius.

## Phase D — Proof & renewals

**D1. AI attribution report**
- `GET /api/reports/ai-attribution` (server-side): AI-sourced leads → contacted → proposal → won; sq ft leased; touches per win; days to close. Built from stage history, activities and leases.
- Dashboard section.
- Test: numbers reconcile with SQL.

**D2. Renewal leads**
- Daily cron creates a renewal inquiry (source `Renewal`) 12 months before a lease ends, and a follow-up at 6 months.
- Test: a lease ending in 11 months → one renewal lead, idempotent.

**D3. Prospect warehouse details**
- Read the warehouse artifact and import the company warehouse details into the intelligence DB, shown on the prospect page.

**D4. Apollo**
- Wire People Search into the contacts flow once the key is upgraded (re-verify the tier first).

## Needed from Bhavya (not blocking)

- Real name + total area of the Olpad warehouse, and area already occupied by existing tenants (goes in "occupied by existing tenants" until real leases are entered).
- Whether the 3 demo warehouses should be archived.

## Progress log

| Step | Status | Commit |
|---|---|---|
| Pre: AI Discovery browse-all + server-side pagination | done | 6fdca0c |
| A1 Real warehouse + manager field (Olpad = `prop_03c74628`, area not set yet) | done | a5f987b |
| A2 Leases + holds tables, calculated free space (baselines backfilled, no numbers changed) | done | 0d13c24 |
| A3 Leases API + Occupancy & Leases tab + edit form "occupied by existing tenants" | done | dc51c45 |
| A4 Won = lease (`POST /inquiries/:id/win`, proposal Accept), stage history, stage-key fixes | done | b2e738f |
| A5 Space holds on proposals + capacity check (split suggestion) | done | 6933228 |
| Fix: Inquiries & Leads had no view/edit/delete permission rows (admins couldn't edit deals in the UI) | done | 865f45e |
| B1 Touch logging + 5-day re-ask, park after 3 no-replies, IST business dates | done | 9826948 |
| B2 "I followed up" UI, Follow-ups timeline, task outcome notes | done | 2d0e05d |
| B3a Server-side Add to CRM (no duplicates, owner = nearest warehouse manager), manual contacts | done | 57d5065 |
| B3b Prospect page: CRM status, key people, draft messages | done | 4ed5381 |
| B4 Today list + 08:00 IST digest + stale-hold release | done | dbef117 |
| B5 AI Discovery search debounce/stale-response fix (+ revenue rounding) | done | b9e78b2 |
| C1 `discovery_runs.property_id` + `company_warehouse_links`; Olpad backfilled (runs 1/2/8, 822 links) | done | dd41095 |
| C2 Runner links re-found companies instead of skipping; list filter by warehouse; nearest warehouse | done | 666eeaf |
| C3 Discovery UI by warehouse (picker, filter, Warehouse column), property panel shows known prospects | done | 46b3aea |
| C4 One account for many sites: 17 accounts / 23 sites grouped (822 rows → 799 accounts); CRM status + Add to CRM account-aware | done | f6cea47 |
| C5 Monthly discovery per managed warehouse (off: `DISCOVERY_CRON_ENABLED`), manager notified; signals research nearest-first | done | (this commit) |

Notes carried forward:
- A won card still shows "N days overdue" from its old `next_follow_up_date` → B1 clears follow-ups on won/lost.
- Holds idle for 30 days and proposals past `expiry_date` are released by the B4 daily job.
- "Fairway Warehouse – Olpad" shows in property matches with 0 sq ft until its real area is entered.
- Phase B judgement calls (confirm with Bhavya): "Interested" schedules a 3-day "confirm requirement" task rather than
  jumping to Req. Confirmed; Today's prospect threshold is score >= 50 (nobody scores 70 yet, max 63); unassigned
  deals show a *suggested* owner instead of being bulk-reassigned; expired proposals only free their space, their
  status is not changed automatically.
- C3 real test run 14 (Olpad, 8 km, 19 Places calls): 0 new, no duplicates — kept, it's genuine data.
- Runs 3/4/5/9/10/11 were ad-hoc test points (0 companies) and stay unlinked; prop_1/2/3 are demo warehouses.
- Pre-existing from 21 Sep (before this plan): intelligence contact "Rajesh Mehta" (source `manual-test`) on
  Ideal Technoplast, and its deal INQ-1051 — left as is.
- C4 deviation from the plan's test list: the 4 "JK Lakshmi Cement Ltd. - <name>" rows are dealers (Ganesh Trading,
  S. M. Enterprise, ...), i.e. separate businesses and prospects themselves, so they are NOT grouped. Grouping rule:
  text after the legal suffix or a site word = a site; any other " - X" suffix = a different business; a group needs
  a website and one domain. Reliance Hazira MEG1 Plant (no website, different name) stays separate. The account's
  main row is its best-researched site (score, then revenue) — e.g. Aether's is Site V.
- CRM has separate company rows for some sites (Reliance x3, Aether x2, Colourtex x2 ...) from the old Add to CRM;
  not merged (same question as Neogen), but deal checks now look across the whole account.
- C5 runs only for warehouses with a manager and a map location (today: Olpad only; the 3 demo parks have no manager).
  Default radius 50 km (`DISCOVERY_CRON_RADIUS_KM`); an 8 km search cost 19 Places calls, 3 km cost 7, so 50 km is
  in the hundreds of calls per warehouse per month — that's why it stays off until Bhavya turns it on.
- Security (pre-existing, not touched): backend/.env.example is committed with what looks like a real production
  DATABASE_URL password and JWT_SECRET — rotate them and replace with placeholders.
- Open data questions: Amit Patel was set as Olpad's manager as a placeholder; Neogen Chemicals exists twice in the
  CRM (comp_e82dd44f / comp_725eaa7a, each with a deal) from the old client-side Add to CRM — merge or keep?
