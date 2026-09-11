# Fairway CRM — Technical Architecture

## 1. Architecture Style
Use a modular monolith. Do not introduce microservices in V1.

```text
React + TypeScript + Tailwind
        |
        | HTTPS / JSON
        v
Node.js + Express
        |
        +--> Auth / RBAC middleware
        +--> Controllers
        +--> Services
        +--> Repositories
        +--> Integrations / Jobs
        |
        v
PostgreSQL
```

## 2. Frontend
- Vite + React + TypeScript
- Tailwind CSS
- shadcn/ui + Radix primitives
- Lucide icons
- TanStack Query
- React Router
- TanStack Table
- React Hook Form + Zod
- Recharts for reporting
- React Leaflet for map layer where required

## 3. Backend
- Node.js + Express.js + TypeScript
- Prisma data layer
- Zod request validation
- Pino structured logging
- secure headers / CORS / rate limiting / request IDs
- centralized error handler
- transaction support for multi-write workflows

## 4. Repository Pattern
Every module should own:
- routes
- controller
- service
- repository/data access
- validation/schema
- types
- business rules
- tests

## 5. Module Boundaries
Frontend modules:
auth, users, dashboard, companies, inquiries, contacts, facilities, pipeline, tasks, activities, properties, property-matching, proposals, site-visits, map, notifications, import-export, reports, settings.

Backend modules mirror the same domain boundaries.

## 6. Runtime Rules
- No database access from React.
- No business logic duplicated in components.
- No direct repository calls from routes.
- Controllers translate HTTP to application service calls.
- Services enforce business rules.
- Repositories perform database access.
- All mutations validate input and authorization before write.

## 7. State and API Calls
Use TanStack Query for server state. Query only the data required by the active screen. Detail tabs that are not visible do not need to load until opened when that improves performance.

## 8. File Handling
Store file metadata in PostgreSQL and file content in a configurable storage adapter. The storage adapter must support local development and production object storage without changing domain code.

## 9. Jobs
Use a job/scheduler layer for future or recurring tasks such as follow-up reminders, notifications, email dispatch and imports. Jobs must be idempotent and logged.

## 10. Observability
- application logs
- access/request logs
- audit logs
- import/export logs
- login/security logs
- integration logs
- AI logs when AI exists

## 11. Deployment
Separate frontend and API deployment is supported. PostgreSQL is externalized. All secrets are environment variables or a secrets manager; never commit credentials.
