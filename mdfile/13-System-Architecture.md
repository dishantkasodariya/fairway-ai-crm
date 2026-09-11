# Fairway CRM — System Architecture Design

```text
                            FAIRWAY CRM
                                 |
              +------------------+------------------+
              |                                     |
         React Web App                         Express API
              |                                     |
     +--------+--------+                 +----------+----------+
     |        |        |                 |         |          |
   Auth    CRM UI   Reports          Auth/RBAC  Domain    Integrations
     |        |        |                 |         |          |
     +--------+--------+                 +----+----+----------+
                                            |
                                         Services
                                            |
                                         Repositories
                                            |
                                        PostgreSQL
                                            |
                              +-------------+--------------+
                              |                            |
                         File Storage                 Job/Queue
                              |                            |
                         PDF/Documents              Reminders/Email
```

## Data Ownership
PostgreSQL owns canonical business records. File storage owns binary content. API owns business rules. React owns presentation and client state only.

## Request Flow
`Browser → Router → Auth/RBAC → Controller → Service → Repository → PostgreSQL → Response`

## Event/Job Flow
`Business event → persisted state → job enqueue → worker → external action → communication/audit log`

## Scaling Direction
Keep modules independent so individual background jobs or integrations can later be extracted if scale requires it, without starting with microservices.
