<div align="center">

# 🏭 FAIRWAY AI CRM
### Next-Generation Industrial Warehouse Leasing & Commercial Operations Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-FF6B6B?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Engineered for Industrial Park Developers, Asset Managers, 3PL Operators & Commercial Leasing Teams across India's Prime Logistics Corridors</b>
</p>

[Key Features](#-core-feature-modules) •
[Architecture](#-system-architecture) •
[Database Model](#-database-schema--data-model) •
[API Reference](#-api-endpoints-reference) •
[Getting Started](#-getting-started) •
[Security](#-security--compliance-hardening) •
[Deployment](#-deployment--production)

---

</div>

## 📌 Overview

**Fairway AI CRM** is a full-stack, enterprise-grade application tailored specifically for the heavy industrial real estate and Grade-A warehouse logistics sector. Traditional CRMs fail to address the technical nuances of industrial spaces—such as floor load capacities (FM2/FM3), clear heights, dock levelers, fire sprinkler standards (K-factor), high-tension power availability, and multi-facility corporate hierarchies.

Fairway bridges this gap with domain-specific workflows covering high-value leasing pipelines across major Indian manufacturing and warehousing hubs:
- **Gujarat**: PCPIR (Dahej), Sanand GIDC, Changodar, Vapi-Surat
- **Maharashtra**: Bhiwandi, Panvel-JNPT, Chakan-Talegaon (Pune)
- **North & South Hubs**: NCR (Farukhnagar, Bilaspur), Bengaluru (Hoskote, Nelamangala), Chennai (Oragadam)

---

## 🌟 Core Feature Modules

### 1. 📊 Executive Operations & Sales Dashboard
- **Live Deal Velocity & Pipeline Valuation**: Real-time aggregation of active requirements, weighted pipeline value, and deal conversion rates.
- **SLA & Urgent Follow-up Feeds**: Action-oriented overdue and upcoming task radar prioritizing high-priority prospective tenants.
- **Regional Corridor Absorption**: Visual distribution of leased vs. available square footage across key industrial corridors.

### 2. 📌 Interactive Kanban Sales Pipeline
- **Smooth Drag-and-Drop Deal Flow**: Built on `@dnd-kit/core` with hardware-accelerated animations, sensory pointer constraints, and touch support.
- **Customizable Pipeline Stages**: Dynamically create, reorder, and configure stages (e.g., *Requirement Ingest*, *Site Inspection*, *Term Sheet Drafting*, *Legal DD*, *Closed Won*).
- **Deal Loss Analysis & Win Celebrations**: Capture standardized lost reasons for actionable churn intelligence and celebratory milestone animations on deal closure.

### 3. 📑 Commercial Leasing Inquiries & Space Matching
- **Deep Technical Criteria Ingestion**: Track precise square footage, clear height (m), power load (kVA), dock count, crane requirements, and flooring specs.
- **Automated Property Matching**: Instantly pair tenant space criteria against available Grade-A warehouse bays and speculative developments.
- **Lifecycle Status Machine**: Seamless transitions between Active, In Review, Postponed, and Converted states.

### 4. 🏢 Grade-A Warehouse & Logistics Park Inventory
- **Structural Specs Repository**: Clear heights, floor load capacity (T/sq.m), bay dimensions, column spacing, and dock apron depths.
- **Commercial Rate Card Management**: Base rent (₹/sq.ft/month), CAM charges, security deposit terms, escalation clauses, and lock-in periods.
- **Corridor Categorization**: Tagging properties by expressways, freight corridors (DFC), and port proximity.

### 5. 🏭 Multi-Facility Corporate Account Directory
- **Parent-Child Account Relationships**: Group corporate parent entities (MNCs, 3PLs, FMCGs) with linked manufacturing plants, regional distribution centers (RDCs), and mother hubs.
- **Multi-Stakeholder Contact Directory**: Track C-suite executives, VP Supply Chain, Industrial Real Estate heads, and regional warehouse managers.

### 6. 🗺️ Leaflet GIS Industrial Corridor Map
- **Interactive Asset Mapping**: High-precision geographic mapping of warehouse parks, land parcels, and client operational nodes.
- **One-Click Corridor Jumps**: Instantly pan and zoom to key logistics clusters (Sanand, Dahej, Bhiwandi, Chakan).
- **Custom Map Themes**: Native synchronization with dark and light UI themes with custom SVG warehouse marker pins.

### 7. 🚜 Site Visit & Inspection Management
- **Digital Inspection Dispatch**: Coordinate physical site tours between clients, property managers, and leasing brokers.
- **On-Site Findings & Feedback Capture**: Record client observations, technical concerns, infrastructure fitment, and next-step actions.

### 8. 📄 Commercial Proposals & Term Sheet Generator
- **Instant Proposal Generation**: Generate branded commercial proposals with financial breakdowns, rent schedules, and possession timelines.
- **One-Click PDF Export**: Clean, printable PDF documents ready for client presentation and board approval.

### 9. 📥 Smart Excel/CSV Data Migration Wizard
- **Universal Spreadsheet Importer**: Batch import thousands of historical inquiries, client records, and properties.
- **Intelligent Header Auto-Mapping**: Automatically aligns unstructured CSV columns with internal database schemas.
- **Pre-Commit Validation**: Visual dry-run and error isolation before database ingestion.

### 10. 🛡️ Role-Based Access Control (RBAC) & Team Management
- **Fine-Grained Permissions**: Modular view/create/edit/delete access control across 15+ sub-modules.
- **Pre-Configured System Personas**:
  - `super_admin`: Full system, tenant, user, and audit access.
  - `admin`: Operational administration, properties, and commercial management.
  - `sales`: Pipeline execution, lead tracking, proposals, and client communications.
  - `viewer`: Read-only access for auditors, partners, or executive oversight.

### 11. ✨ AI-Discovered Prospects (Company Intelligence Engine)
- **Radius-Based Prospect Discovery**: From any warehouse park's detail page, kick off a tiled search for manufacturers/suppliers/logistics companies within a configurable radius of its coordinates.
- **Opportunity Scoring**: Each discovered company is enriched with a revenue estimate and lead signals (expansion, funding, hiring, tenders, distress, etc.) and given a deterministic, auditable opportunity score.
- **One-Click CRM Conversion**: Promote a scored prospect straight into a real `companies` (+ `facilities`) record without leaving the property page.
- Powered by `/intelligence`, a separate Python/FastAPI service in this repo — see [`intelligence/README.md`](./intelligence/README.md). The Node backend proxies to it via `backend/src/controllers/intelligence.controller.ts` so its API key never reaches the browser.

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Client ["Client Layer (React 18 + Vite + Tailwind)"]
        UI[App UI & Modular Pages]
        DND[Pipeline Kanban (@dnd-kit)]
        GIS[Leaflet GIS Corridors Map]
        STATE[Auth & Theme Context Providers]
        API_CLIENT[Axios / Fetch API Client]
        UI --> STATE
        DND --> API_CLIENT
        GIS --> API_CLIENT
        STATE --> API_CLIENT
    end

    subgraph Gateway ["Reverse Proxy & Security Barrier"]
        CORS[Explicit CORS Whitelist]
        AUTH_MW[JWT Verification & Header Defense]
        RBAC_MW[Granular Permission Guard]
    end

    subgraph Backend ["Backend API Server (Node.js + Express + TypeScript)"]
        ROUTER[Central Route Dispatcher]
        CONTROLLERS[20+ Business Domain Controllers]
        SERVICES[Inquiry / Pipeline / Export Services]
        ROUTER --> CONTROLLERS
        CONTROLLERS --> SERVICES
    end

    subgraph Persistence ["PostgreSQL 15+ Database"]
        USERS[(users & roles)]
        INQUIRIES[(inquiries & pipeline_stages)]
        COMPANIES[(companies & facilities)]
        PROPERTIES[(properties & corridors)]
        PROPOSALS[(proposals & term_sheets)]
        AUDIT[(audit_logs & tasks)]
    end

    API_CLIENT -->|Bearer Token HTTP/JSON| CORS
    CORS --> AUTH_MW
    AUTH_MW --> RBAC_MW
    RBAC_MW --> ROUTER
    SERVICES -->|Connection Pool (node-pg)| USERS
    SERVICES --> INQUIRIES
    SERVICES --> COMPANIES
    SERVICES --> PROPERTIES
    SERVICES --> PROPOSALS
    SERVICES --> AUDIT
```

---

## 🗄️ Database Schema & Data Model

The PostgreSQL schema is fully relational, normalized, and optimized with indexes on foreign keys and frequently queried status fields:

| Table Name | Primary Purpose | Key Foreign Keys / Relations |
| :--- | :--- | :--- |
| `users` | User credentials, profiles, status, department | References `roles` |
| `roles` | RBAC roles (Super Admin, Admin, Sales, Viewer) | System and custom roles |
| `role_permissions` | Fine-grained module-level action permissions | References `roles` |
| `companies` | Client accounts, logistics firms, manufacturers | Parent account relations |
| `contacts` | Individual stakeholders and decision-makers | `company_id` -> `companies` |
| `facilities` | Manufacturing units, warehouses, plants | `company_id` -> `companies` |
| `properties` | Grade-A warehouses, land parcels, parks | Spatial corridor grouping |
| `inquiries` | Leads, space requirements, leasing criteria | `company_id`, `contact_id`, `assigned_to` |
| `pipeline_stages` | Custom Kanban stage definitions & ordering | Dynamic stage sequencing |
| `site_visits` | Scheduled and completed physical inspections | `inquiry_id`, `property_id`, `assigned_to` |
| `proposals` | Commercial leasing term sheets and quotes | `inquiry_id`, `property_id` |
| `tasks` | Follow-ups, action items, deadlines | `inquiry_id`, `company_id`, `assigned_to` |
| `calls` | Telephony and client call logs | `inquiry_id`, `contact_id` |
| `notes` | Rich textual notes and updates on inquiries | `inquiry_id`, `created_by` |
| `documents` | Uploaded blueprints, fire NOCs, term sheets | `inquiry_id`, `company_id` |
| `communications` | Omnichannel communication trail (Email/SMS) | `inquiry_id`, `company_id` |
| `audit_logs` | Immutable security and change event log | `user_id` -> `users` |

---

## 🔌 API Endpoints Reference

All protected endpoints require an `Authorization: Bearer <token>` header obtained from `/api/auth/login`.

### Authentication & User Management
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates user; returns signed JWT and profile |
| `GET` | `/api/auth/profile` | Authenticated | Retrieves current authenticated session details |
| `PUT` | `/api/auth/profile` | Authenticated | Updates current user profile and preferences |
| `GET` | `/api/users` | Admin | Lists all team members and lead assignments |
| `POST` | `/api/users` | Admin | Registers a new user account with assigned role |

### Companies & Facilities
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/companies` | `companies:view` | Fetch paginated company master list |
| `POST` | `/api/companies` | `companies:create` | Create a new corporate entity |
| `GET` | `/api/companies/:id` | `companies:view` | Detailed company view with linked facilities & contacts |
| `PUT` | `/api/companies/:id` | `companies:edit` | Update company metadata |
| `DELETE` | `/api/companies/:id` | `companies:delete` | Soft/hard delete company record |
| `GET` | `/api/facilities` | `companies:view` | List all warehouses, plants, and hubs |
| `POST` | `/api/facilities` | `companies:create` | Add a new facility linked to a company |

### Inquiries & Pipeline Management
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/inquiries` | `inquiries:view` | Filter and retrieve inquiries with commercial specs |
| `POST` | `/api/inquiries` | `inquiries:create` | Ingest new leasing lead |
| `GET` | `/api/inquiries/:id` | `inquiries:view` | Full inquiry detail (specs, notes, proposals, visits) |
| `PUT` | `/api/inquiries/:id` | `inquiries:edit` | Update inquiry details or stage |
| `PATCH`| `/api/inquiries/:id/stage`| `inquiries:edit` | Fast stage progression (used by Kanban drag-and-drop) |
| `DELETE`| `/api/inquiries/:id` | `inquiries:delete` | Archive or delete inquiry |
| `GET` | `/api/pipeline-stages` | `inquiries:view` | List configured pipeline stages |
| `POST` | `/api/pipeline-stages` | `settings:edit` | Add or reorder pipeline stages |

### Properties & Corridors
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/properties` | `properties:view` | Inventory list with structural and leasing specs |
| `GET` | `/api/properties/corridors`| `properties:view` | Unique industrial corridors summary (safe read-only) |
| `POST` | `/api/properties` | `properties:create` | List a new warehouse park or unit |
| `PUT` | `/api/properties/:id` | `properties:edit` | Update warehouse specifications or availability |

### Operations, Site Visits & Proposals
| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/site-visits` | `inquiries:view` | Scheduled and completed client inspections |
| `POST` | `/api/site-visits` | `inquiries:create` | Schedule a new site inspection |
| `GET` | `/api/proposals` | `inquiries:view` | All generated commercial term sheets |
| `POST` | `/api/proposals` | `inquiries:create` | Generate a new proposal |
| `GET` | `/api/tasks` | `tasks:view` | Actionable follow-ups and operational deadlines |
| `GET` | `/api/audit-logs` | `audit:view` | Immutable system audit log trail |

---

## 🔒 Security & Compliance Hardening

The application incorporates multi-layered defense-in-depth security:

- **Strict Cryptographic JWT Authentication**: Client request headers (`x-user-role`, `x-user-id`) are never trusted. All claims are decoded exclusively from cryptographically verified Bearer tokens.
- **Fail-Fast Environment Validation**: The backend aborts startup in production if `JWT_SECRET` is missing, unconfigured, or set to insecure defaults.
- **Enforced Permission Gateways (`requirePermission`)**: Every CRUD route is guarded against unauthorized access based on the user's role permission matrix.
- **RFC 7231 Safe GET Methods**: Idempotent HTTP `GET` handlers (e.g. `/api/properties/corridors`, `/api/roles-permissions`) perform strictly read-only queries with zero mutation side-effects.
- **Explicit CORS Policy**: Tight whitelist restricting requests strictly to authorized client domains.
- **SQL Injection Defense**: All database queries utilize parameterized SQL statements via `node-pg`.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **PostgreSQL**: `v14.0` or higher (running locally or on cloud providers like Neon / AWS RDS)
- **npm** (or yarn/pnpm)

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/fairway-ai-crm.git
cd fairway-ai-crm
```

### 2. Configure Environment Variables

**Backend Configuration (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fairway_crm
JWT_SECRET=super-secure-high-entropy-jwt-secret-key-32-chars-min
```

**Client Configuration (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Install Dependencies
```bash
# Install root dependencies
npm install

# Start both backend and client concurrently
npm run dev
```

- **Client Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 4. Default Demonstration Credentials
On initial startup, the database automatically initializes tables, runs required schema migrations, and seeds the default administrator:

| Email | Password | Role | Access Level |
| :--- | :--- | :--- | :--- |
| `admin@fairway.com` | `admin123` | `super_admin` | Full System Access |

### 5. (Optional) AI-Discovered Prospects Service
The "AI Prospects" tab on a property's page needs the intelligence service running and pointed to by the backend's `INTELLIGENCE_API_URL`/`INTELLIGENCE_API_KEY` env vars (see `backend/.env.example`). Everything else in the CRM works without it. Setup:
```bash
cd intelligence
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in PLACES_API, GROQ_API_KEY, SERPER_API_KEY, API_KEY
cd docker && docker compose up -d postgres && cd ..
alembic upgrade head
uvicorn app.main:app --reload   # http://localhost:8000
```
Full details in [`intelligence/README.md`](./intelligence/README.md).

---

---

## 🧪 Automated Testing & QA Suite

Fairway CRM includes comprehensive automated testing across all layers:

### Running Backend Unit, Integration & E2E Tests
```bash
cd backend
npm test
```
- **Total Tests**: 41 automated tests passing
- **Test Runner**: Node.js Native Test Runner with `tsx` and `supertest`
- **Coverage**:
  - `src/utils/jwt.test.ts`: Cryptographic token issue, payload verification, and signature rejection.
  - `src/utils/password.test.ts`: Bcrypt hashing, salt generation, and password validation.
  - `src/tests/api.integration.test.ts`: Health checks with DB latency, 404 error boundaries, auth login/me, RBAC permissions, and protected business resources (companies, inquiries, properties, leases, today).
  - `src/tests/intelligence.test.ts`: AI schema conversion (`toCamelCaseDeep`), API timeout/retries with exponential backoff, and failure recovery.
  - `src/tests/e2e.flow.test.ts`: Full lifecycle test simulating an end-to-end user session from login through deal progression and property matching to DB cleanup.

### Running Python Intelligence Engine Tests
```bash
cd intelligence
pytest tests
```
- **Total Tests**: 20 tests covering classification rules, agent workflows, and data fusion.

### Running Production Bundle Builds
```bash
# Verify TypeScript and build client bundle
npm run build --prefix client

# Verify backend TypeScript compilation
npm run build --prefix backend
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18.3, TypeScript 5, Vite 6 |
| **Styling & Design System** | Tailwind CSS 3.4, Custom CSS Design Tokens (Dark / Light Theme Engine) |
| **Kanban & Drag-and-Drop** | `@dnd-kit/core`, `@dnd-kit/utilities` |
| **GIS & Interactive Maps** | Leaflet 1.9, `react-leaflet`, OpenStreetMap Tiles |
| **Icons & Visuals** | Lucide React, Canvas Confetti |
| **Backend Runtime** | Node.js 18+, Express 4.21, TypeScript (ESM) |
| **Database & ORM** | PostgreSQL 15+, `pg` Connection Pool with Auto-migration & Schema Isolation |
| **Authentication & Crypto** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` |
| **File & Spreadsheet Tools** | SheetJS (`xlsx`), Custom CSV Streaming Parser |

---

## ☁️ Deployment & Production

### Live Production Deployments
- **Frontend Web App**: [https://fairway-ai-crm.onrender.com](https://fairway-ai-crm.onrender.com)
- **CRM Backend API**: [https://fairway-crm-backend.onrender.com](https://fairway-crm-backend.onrender.com)
  - Health check: [https://fairway-crm-backend.onrender.com/health](https://fairway-crm-backend.onrender.com/health)
- **AI Intelligence Service**: [https://fairway-intelligence.onrender.com](https://fairway-intelligence.onrender.com)
  - Health check: [https://fairway-intelligence.onrender.com/health](https://fairway-intelligence.onrender.com/health)

### Running in Production
```bash
# Start backend production server
NODE_ENV=production node backend/dist/server.js
```

### Zero-Config Vercel Deployment
The client contains pre-configured Single Page Application (SPA) routing in `vercel.json` ensuring dynamic client-side routes (`/pipeline`, `/inquiries/:id`, `/companies`) resolve without 404 errors.

---

## 📄 License & Proprietary Notice

Proprietary Software. © Fairway Logistics & Commercial Warehouse Operations. All rights reserved.
