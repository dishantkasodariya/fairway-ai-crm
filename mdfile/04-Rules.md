# Fairway CRM — Engineering Rules

## Non-negotiable
1. No mock data in production features.
2. PostgreSQL is the source of truth.
3. Every feature must be real end-to-end: UI → API → service → repository → PostgreSQL.
4. No unnecessary API calls.
5. Fetch data on the relevant page/action.
6. No frontend-only security.
7. Permissions must be enforced server-side.
8. Use reusable components.
9. Prefer existing approved libraries over reinventing primitives.
10. Keep modules isolated and composable.
11. Do not duplicate business logic.
12. Do not leak secrets into logs or client responses.
13. No hard-coded lookup values when the value is managed by the database.
14. No hard-coded dashboard metrics.
15. Every mutation must have validation, authorization and error handling.
16. Multi-step writes that must be atomic use a DB transaction.
17. Track relevant business changes in audit history.
18. Every async UI needs loading, empty and error states.
19. Buttons must prevent duplicate submissions while pending.
20. No fake AI outputs.
21. AI features must be modular additions to the CRM foundation.
22. Keep source terminology aligned with Fairway's approved specifications.
23. Keep generated documents traceable to the source records used.
24. Import/export operations must be auditable.
25. Use typed contracts between frontend and backend.

## Naming
Use consistent plural REST resources and singular domain entities in code. Avoid unexplained abbreviations.

## API
Version APIs from the start, e.g. `/api/v1/...`.

## Error Contract
Return a predictable error envelope containing request ID, machine-readable code and safe user-facing message.

## UI
One icon library, one semantic color system, one spacing system, one notification system.
