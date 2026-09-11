# Fairway CRM — Implementation Plan

## Stage 1 — Repository & Tooling
1. Initialize frontend and backend apps.
2. Configure TypeScript strict mode.
3. Add ESLint/Prettier.
4. Add environment configuration.
5. Configure CI quality gates.
6. Create module structure.

## Stage 2 — Database First
1. Create PostgreSQL database.
2. Define Prisma schema.
3. Add enums/constraints/indexes.
4. Create migrations.
5. Seed minimal Super Admin/role/permission reference data.
6. Add DB readiness/health check.
7. Add repository integration tests.

## Stage 3 — Auth & Access
1. Login/logout/current-user APIs.
2. Password hashing.
3. Session/token strategy.
4. Role and permission resolution.
5. Backend authorization middleware.
6. Permission-driven frontend guards/sidebar.
7. Login security logs.

## Stage 4 — Core CRM APIs
1. Companies.
2. Contacts.
3. Facilities.
4. Inquiries.
5. Pipeline.
6. Tasks.
7. Activities.
8. Notes.
9. Follow-ups.
10. Audit history.

## Stage 5 — Core CRM UI
1. Application shell.
2. Permission-aware sidebar.
3. Dashboard.
4. Company list/detail.
5. Inquiry list/detail.
6. Contact/facility views.
7. Pipeline.
8. Tasks/activities/notes/follow-ups.
9. Search/filter/lookup components.

## Stage 6 — Sales Modules
1. Properties.
2. Property matching foundation.
3. Proposals.
4. Site visits.
5. Won/Lost.
6. Map integration.

## Stage 7 — Import/Export
1. CSV inspection.
2. XLSX inspection.
3. Mapping UI.
4. Validation.
5. Duplicate detection.
6. Preview.
7. Transactional import.
8. Import error report/history.
9. CSV/XLSX export.
10. Export audit logging.

## Stage 8 — Documents and Follow-up Email
1. Storage adapter.
2. Document metadata.
3. Follow-up PDF template/data service.
4. Download endpoint.
5. Email integration.
6. Review/approve/send workflow.
7. Attach PDF.
8. Save communication/activity record.

## Stage 9 — UX Quality
1. Skeleton system.
2. Page loaders.
3. Empty states.
4. Error/retry states.
5. Toast notifications bottom-right.
6. Accessibility pass.
7. Responsive pass.

## Stage 10 — Testing / Hardening
1. Unit tests.
2. Repository tests.
3. API tests.
4. E2E tests.
5. Permission matrix verification.
6. Error and loading verification.
7. Fresh database migration test.
8. Import/export regression test.
9. Security review.
10. Production build verification.

## Stage 11 — AI / Omni-channel Expansion
Only after the CRM foundation is stable:
- WhatsApp
- Email inbound processing
- LinkedIn permitted workflow
- AI extraction
- AI priority
- AI scoring
- AI drafting
- intelligence modules

## Delivery Rule
Do not declare a milestone complete based on screenshots or static UI. A milestone is complete only when a real user can execute the intended workflow against PostgreSQL from start to finish.
