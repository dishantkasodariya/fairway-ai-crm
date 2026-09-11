# Fairway CRM — Testing Strategy

## Unit Tests
Cover:
- validation schemas
- score/priority rules that exist outside AI
- pipeline transition rules
- permission checks
- service functions
- file mapping/validation logic
- PDF data transformation

## Integration Tests
Cover:
- PostgreSQL repositories
- auth + role resolution
- CRUD APIs
- transaction behavior
- import pipeline
- export generation
- document metadata

## API Tests
For every protected endpoint test:
- valid request
- invalid payload
- unauthenticated
- authenticated but forbidden
- missing record
- conflict/duplicate
- database failure behavior

## Frontend Tests
Cover:
- routing guards
- permission-driven sidebar
- forms
- table filters
- lookup components
- loading/skeleton states
- empty/error states
- toast triggers
- import/export flows

## E2E Tests
Minimum business paths:
1. login → dashboard
2. create company → contact → inquiry
3. move pipeline stage
4. create follow-up → generate PDF → download
5. send approved follow-up email with PDF
6. import CSV/XLSX → validate → import → data visible
7. filter leads → export
8. unauthorized user attempts restricted operation

## Regression
Every completed ticket adds or updates tests for changed business behavior.

## Quality Gates
- lint passes
- type-check passes
- unit tests pass
- integration tests pass
- critical E2E flows pass
- migration applies cleanly on a fresh DB
