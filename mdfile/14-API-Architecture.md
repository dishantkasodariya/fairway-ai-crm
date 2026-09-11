# Fairway CRM — API Architecture

## Base
`/api/v1`

## Auth
- POST /auth/login
- POST /auth/logout
- GET /auth/me
- POST /auth/change-password

## Companies
- GET /companies
- GET /companies/lookup
- POST /companies
- GET /companies/:id
- PATCH /companies/:id
- DELETE /companies/:id
- GET /companies/:id/overview
- GET /companies/:id/contacts
- GET /companies/:id/facilities
- GET /companies/:id/activities
- GET /companies/:id/notes
- GET /companies/:id/tasks

## Inquiries
- GET /inquiries
- GET /inquiries/lookup
- POST /inquiries
- GET /inquiries/:id
- PATCH /inquiries/:id
- DELETE /inquiries/:id
- PATCH /inquiries/:id/stage
- PATCH /inquiries/:id/owner
- GET /inquiries/:id/property-matches
- POST /inquiries/:id/property-match

## CRM Operations
- GET /pipeline
- GET /tasks
- POST /tasks
- PATCH /tasks/:id
- DELETE /tasks/:id
- GET /follow-ups
- POST /follow-ups
- PATCH /follow-ups/:id
- POST /follow-ups/:id/pdf
- POST /follow-ups/:id/send-email
- GET /activities
- POST /activities

## Properties / Proposals / Visits
Resource CRUD plus matching/proposal/site-visit actions as defined by permissions.

## Import / Export
- POST /imports/preview
- POST /imports/validate
- POST /imports/commit
- GET /imports/:id
- GET /imports/:id/errors
- GET /exports/companies
- GET /exports/inquiries
- GET /exports/contacts

## Admin
- GET/POST/PATCH /users
- GET/POST/PATCH /roles
- GET/POST/PATCH /permissions
- GET/PATCH /pipeline-stages

## Dashboard / Search
- GET /dashboard/summary
- GET /dashboard/followups
- GET /dashboard/activities
- GET /search
- GET /filters

## API Rules
- versioned
- authenticated by default
- permission checked per route/action
- Zod-validated inputs
- pagination for list endpoints
- stable error envelope
- request ID in response/logging
- no over-fetching by default
