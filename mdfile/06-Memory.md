# Fairway CRM — Project Memory / Context Rules

## Purpose
This document is the persistent implementation context for developers and future agents.

## Product Identity
- Product: Fairway CRM
- Parent Product: Fairway AI
- Domain: industrial warehouse leasing
- Primary geography in source scope: India/Gujarat context
- V1 objective: replace Excel inquiry workflow

## Core Business Process
Inquiry → Company → Contact → Facility → Pipeline → Follow-up → Activity/Notes → Property Match → Proposal → Site Visit → Negotiation → Won/Lost

## Source-of-Truth Principles
- One company, one source of truth.
- One customer, one history.
- Facilities are separate records from companies.
- Every active opportunity has an owner and next action/follow-up.
- History should not disappear.
- Permissions are enforced server-side.

## Current Engineering Decisions
- React + TypeScript + Tailwind CSS
- Node.js + Express.js
- PostgreSQL
- Modular feature-based code structure
- Real database data only
- Dynamic lookups
- Permission-driven sidebar/routes/actions
- Super Admin with full permission management
- Skeleton/loading/empty/error states
- Bottom-right toast notifications
- CSV/Excel import and export
- Follow-up PDF generation and download
- Follow-up email can attach PDF after user approval
- Application, API and audit logs

## AI Strategy
CRM foundation first. AI comes as modular layers. No fake AI or placeholder AI behavior.

## Future AI Inputs
- WhatsApp
- Email
- LinkedIn within permitted capabilities
- other authorized lead sources

## Future AI Outputs
- requirement extraction
- lead prioritization/scoring
- communication drafting
- property matching intelligence
- opportunity intelligence
- decision recommendations

## UI Quality Rules
Professional SaaS, data-rich, clean, restrained, consistent, responsive. Do not create AI-slop visual patterns.
