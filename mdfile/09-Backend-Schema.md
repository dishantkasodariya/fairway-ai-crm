# Fairway CRM — Backend Schema / Module Contracts

## Module Pattern
```text
module/
  routes.ts
  controller.ts
  service.ts
  repository.ts
  schema.ts
  types.ts
  permissions.ts
  tests/
```

## Core Modules
- auth
- users
- roles
- permissions
- companies
- contacts
- facilities
- inquiries
- pipeline
- tasks
- followups
- activities
- notes
- properties
- property-matching
- proposals
- site-visits
- documents
- communications
- import-export
- notifications
- dashboard
- audit-logs

## Service Contracts
### CompanyService
create, list, getById, update, delete, lookup, assignOwner

### InquiryService
create, list, getById, update, delete, changeStage, assignOwner, score/manualPriorityUpdate foundation

### FollowUpService
create, list, update, complete, cancel, generatePdf, sendEmail

### ImportService
inspectFile, mapColumns, validateRows, detectDuplicates, preview, import, createErrorReport

### ExportService
exportCsv, exportXlsx, applyFilters, recordExportLog

### AuthService
login, logout, getCurrentUser, passwordHash/verify, role/permission resolution

## Error Handling
All modules use shared error types and map domain errors to safe HTTP responses.
