# Fairway CRM — Product Requirements Document

## 1. Product
**Fairway CRM V1** is the operational CRM foundation for Fairway's industrial warehouse leasing business. It replaces the existing Excel inquiry workflow and manages an opportunity from inquiry/import through Won/Lost.

## 2. Product Goal
Create one source of truth for companies, inquiries/leads, contacts, facilities, activities, tasks, follow-ups, properties, proposals, site visits, pipeline history, documents, permissions and audit history.

Core lifecycle:

`Inquiry → Company → Contact → Facility → Pipeline → Follow-up → Activity/Notes → Property Match → Proposal → Site Visit → Negotiation → Won/Lost`

## 3. Technical Baseline
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Node.js + Express.js
- Database: PostgreSQL
- Architecture: modular / feature-based
- Authentication: login + signup where enabled + RBAC
- UI: shadcn/ui/Radix + Tailwind, Lucide icons
- Client data fetching: TanStack Query
- Forms: React Hook Form + Zod
- Tables: TanStack Table
- Notifications: Sonner, bottom-right
- Dates: date-fns
- ORM: Prisma unless project tooling requires an equivalent PostgreSQL data layer

## 4. Functional Scope
### Authentication and access
- Login/logout/session handling
- Super Admin
- Admin
- Management
- Salesperson
- CRM/Operations
- Business Development
- Configurable roles and permissions
- Permission-aware sidebar, routes and actions
- Server-side authorization

### CRM
- Dashboard
- Inquiries / Leads
- Companies
- Contacts
- Facilities
- Pipeline
- Tasks
- Follow-ups
- Activities
- Notes
- Properties
- Property matching foundation
- Proposals
- Site visits
- Map integration
- Notifications
- Reports
- Documents
- Audit logs

### Data operations
- CSV import
- Excel import
- Mapping/preview/validation
- Duplicate detection
- Import history and error report
- CSV export
- Excel export
- Filter-aware export

### Dynamic behavior
- PostgreSQL is the source of truth
- No mock CRM data in production UI
- Lookup/search values come from APIs/database
- Pagination/filter/search are server-backed where appropriate
- Avoid unnecessary API calls; fetch on user action or required screen state
- Loading, skeleton, empty and error states are required

### Follow-up and document workflow
- Create/complete follow-up
- Generate follow-up PDF from real database data
- Download generated PDF
- Save document metadata
- Email follow-up with PDF attachment after user review/approval
- Record email and attachment in communication/activity history

## 5. Definition of Done
A feature is done only when UI, API, schema, validation, permissions, loading/error/empty states, audit requirements, responsive behavior, basic tests and real PostgreSQL data flow are implemented and manually verified end-to-end.

## 6. AI Boundary
V1 CRM foundation is AI-ready but must not contain fake AI output. Future AI modules can add lead extraction, AI scoring, opportunity intelligence, communication drafting and property intelligence without redesigning core CRM entities.

## 7. UX Principles
Premium industrial + modern SaaS + professional enterprise. Clean, professional, data-rich, easy to operate, executive-friendly and responsive. Avoid Excel-like or overly colourful design.

## 8. Source Alignment
This document is based on the supplied Fairway CRM PRD and Fairway AI master specification; the requested engineering decisions above extend that baseline without replacing its core business process.
