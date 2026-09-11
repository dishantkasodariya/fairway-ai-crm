# Fairway CRM — Security & Access Control

## Roles
### Super Admin
Full platform administration, users, roles, permissions, settings, audit, all CRM records.

### Admin
CRM operations, user/assignment functions allowed by assigned permissions.

### Management
Dashboard, reports, CRM, intelligence/property visibility according to policy.

### Salesperson
Assigned leads/companies, communications, properties, tasks/follow-ups and permitted CRM actions.

### CRM/Operations
Operational data, imports/exports, follow-up, reporting and assignments as configured.

### Business Development
Prospecting, companies, expos/events and partnerships as configured.

## Permission Model
Use atomic permissions such as:
- companies.view/create/edit/delete/import/export
- contacts.view/create/edit/delete/import/export
- inquiries.view/create/edit/delete/import/export
- followups.view/create/edit/delete/pdf/email
- reports.view/export
- users.manage
- roles.manage
- settings.manage
- audit.view

## Sidebar
Sidebar items are generated from the authenticated user's resolved permissions. Hidden in UI when unavailable, but the API remains the real security boundary.

## Scope
Support data scope where needed:
- OWN: user's records
- TEAM: team's records
- ALL: all authorized records

## Access Denied
- 401 when unauthenticated
- 403 when authenticated but forbidden
- No sensitive reason leakage

## Audit
Record security-sensitive actions such as role/permission changes, imports/exports, destructive operations and important CRM state changes.
