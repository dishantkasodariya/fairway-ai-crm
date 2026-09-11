# Fairway CRM — UI/UX Design Specification

## 1. Navigation
Permission-driven sidebar:
- Dashboard
- CRM: Inquiries, Companies, Contacts, Facilities, Pipeline, Tasks, Activities, Properties, Property Matching, Proposals, Site Visits
- Map
- Reports
- Notifications
- Settings: Users, Roles & Permissions, Pipeline Stages, System Settings

Items appear only when the current user has the corresponding permission.

## 2. Global UI
- fixed or collapsible sidebar
- top search/user area
- page title and actions
- consistent content width
- bottom-right toast container

## 3. Core Screens
### Login
Email, password, validation, loading state, error state, password visibility control.

### Dashboard
KPI cards from API, pipeline summary, my leads, due/overdue follow-ups, recent activity.

### Company list
Server-side search, filters, pagination, sorting, column controls, import/export, create action.

### Company detail
Header, actions, contacts, facilities, CRM activity timeline, tasks, notes, next follow-up, documents, proposals, map.

### Inquiry list/detail
Real database records, source, priority, stage, owner, next action, next follow-up, property-match context.

### Pipeline
Kanban using configurable stages, drag/drop only if permitted, stage update API, audit trail.

### Follow-up
Schedule, assign, outcome, generate PDF, download, send email after review.

### Import
Upload → mapping → preview → validation → duplicate review → import → summary.

### Export
Format selector, current-filter summary, permission check, generation/download state.

## 4. Component Rules
All domain pages use shared primitives. No one-off button/input/table variants unless a real domain need exists.

## 5. Loading
Use skeletons matching final layout. Buttons show pending state. Disable duplicate submission.

## 6. Notifications
Sonner/toast bottom-right for success/info/warning/error. Keep messages concise and actionable.

## 7. Accessibility
Keyboard support, visible focus, labels, semantic controls, readable contrast, screen-reader-friendly error messages.
