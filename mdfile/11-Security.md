# Fairway CRM — Security Specification

## Authentication
- Passwords stored only as strong one-way hashes.
- Never log passwords, tokens or secrets.
- Secure session/token handling.
- Login throttling/rate limiting.
- Account active/inactive checks.
- Logout invalidates the current session/token strategy.

## Authorization
Permission checks are enforced in backend middleware/services for every protected mutation and sensitive read.

## API Security
- HTTPS in production
- secure headers
- CORS allowlist
- request validation
- rate limiting
- request size limits
- safe error responses
- no stack traces in production responses

## Data Security
- parameterized/ORM queries
- foreign-key integrity
- least-privilege DB user
- encrypted backups/storage where supported
- secrets outside source control

## File Security
- validate extension and MIME
- enforce size limits
- generate safe storage keys
- prevent path traversal
- authorization before download
- scan/inspect files where the production environment provides a suitable mechanism

## Audit
Track who changed what, old value, new value, timestamp, entity and relevant request/user context where applicable.

## Logs
Application logs and audit logs are distinct. Sensitive data must be redacted.
