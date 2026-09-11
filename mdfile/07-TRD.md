# Fairway CRM — Technical Requirements Document (TRD)

## 1. Functional Requirements
### Authentication
- login
- logout
- current-user endpoint
- password hashing
- active/inactive account handling
- session/token lifecycle
- failed-login logging

### Authorization
- role CRUD
- permission CRUD
- role-permission mapping
- user-role mapping
- module/action permissions
- server-side policy enforcement

### Companies
CRUD, search, filters, owner, priority, status, contacts, facilities, notes, activities, tasks, stage history.

### Inquiries/Leads
Unique identifier, source, company/contact links, requirement fields, location, industry, budget, possession date, lease duration, priority, score, status, next action and follow-up.

### Pipeline
Configurable stages; stage changes recorded in history.

### Tasks/Follow-ups
Create, assign, schedule, complete, cancel, overdue state, reminders, PDF generation.

### Properties
Property master with availability and technical/commercial information; link to inquiries for matching.

### Proposals
Proposal record, selected company/inquiry/contact/property, value/terms, document, dates, response and status.

### Site Visits
Date, property, company, contact, salesperson, notes, outcome and follow-up.

### Import/Export
CSV/XLSX import; mapping, validation, duplicate detection, errors, history; CSV/XLSX export using current filters.

### Notifications
New inquiry, follow-up due/overdue, task assignment, stage change, proposal status, site visit, and other approved alerts.

## 2. Non-Functional Requirements
- secure by default
- real PostgreSQL data
- responsive UI
- predictable API errors
- structured logs
- auditability
- modular maintainability
- no hidden frontend-only authorization
- reasonable query performance with indexes and pagination

## 3. UX State Requirements
Every asynchronous feature supports loading, skeleton, empty, error and permission-denied states.

## 4. Data Integrity
Use foreign keys, unique constraints, validation and transactions. Never silently discard imported data.

## 5. Operational Requirements
Provide health checks, database readiness check, error logs, audit logs, backups and migration process.
