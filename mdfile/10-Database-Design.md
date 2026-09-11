# Fairway CRM — PostgreSQL Database Design

## 1. Tables
### Identity & Access
- users
- roles
- permissions
- user_roles
- role_permissions
- sessions (if server-side sessions are selected)
- login_logs

### CRM
- companies
- contacts
- facilities
- inquiries
- pipeline_stages
- inquiry_stage_history
- assignments
- tasks
- follow_ups
- notes
- activities

### Properties & Sales
- properties
- property_matches
- proposals
- proposal_documents
- site_visits

### Communications & Documents
- communications
- communication_attachments
- documents

### System
- notifications
- audit_logs
- import_jobs
- import_rows/errors
- export_logs

### Future AI
- ai_extraction_logs
- ai_score_logs
- ai_recommendations
- ai_signal_links

## 2. Core Relationships
```text
Company 1---N Contacts
Company 1---N Facilities
Company 1---N Inquiries
Company 1---N Notes
Company 1---N Activities
Company 1---N Tasks
Inquiry N---1 Company
Inquiry N---1 Contact
Inquiry N---1 Pipeline Stage
Inquiry 1---N Stage History
Inquiry 1---N Follow-ups
Inquiry 1---N Property Matches
Inquiry 1---N Proposals
Property 1---N Property Matches
Proposal 1---N Documents
Company 1---N Communications
FollowUp 1---N Documents
Communication 1---N Attachments
```

## 3. Data Integrity
- foreign keys
- unique company/inquiry identifiers
- indexed foreign keys
- created_at / updated_at
- soft delete only where business need exists
- transaction for multi-table workflows

## 4. Important Indexes
- companies(name)
- companies(city)
- contacts(company_id, email)
- inquiries(company_id, status, stage_id)
- inquiries(owner_id, next_followup_at)
- activities(company_id, activity_date)
- follow_ups(owner_id, due_at, status)
- communications(company_id, created_at)
- audit_logs(entity_type, entity_id, created_at)

## 5. Dynamic Lookups
Lookup endpoints query the relevant tables and return minimal fields needed for comboboxes. Do not ship entire datasets to the browser just to populate a select.
