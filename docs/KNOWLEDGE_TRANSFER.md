# 📘 FAIRWAY CRM — Knowledge Transfer (KT) Document

> **Document Version:** 1.0.0  
> **Status:** Final Deliverable  
> **Last Updated:** September 2026  
> **Intended Audience:** Onboarding Software Engineers, DevOps Engineers, QA Automation Leads, Support Engineers

---

## 1. Project Overview & Business Domain

### 1.1 Executive Summary
**Fairway CRM** is an industrial real estate and Grade-A logistics warehouse management platform. It automates commercial leasing operations across key Indian industrial clusters:
- **Gujarat**: PCPIR (Dahej), Sanand GIDC, Changodar, Vapi-Surat
- **Maharashtra**: Bhiwandi, Panvel-JNPT, Chakan-Talegaon (Pune)
- **NCR & South**: Farukhnagar, Bilaspur, Hoskote, Oragadam

### 1.2 The Core Problem Fairway Solves
Generic sales CRMs (Salesforce, HubSpot, Zoho) treat opportunities as generic currency deals. In industrial warehousing, a lease cannot proceed without complex physical and structural compatibility checks:
- Can the slab handle the tenant's high-bay racking load ($7.5\text{ Tons/m}^2$)?
- Is the clear height sufficient for automated storage and retrieval systems (ASRS) ($12\text{ m}$ to $14\text{ m}$)?
- Does the facility have dock levelers with adequate truck apron depth ($35\text{ m}$ turning radius)?
- Does the facility hold fire NOC and K-14/K-25 ESFR sprinkler grid approvals?

Fairway CRM natively integrates these technical parameters across lead capture, GIS corridor mapping, site inspections, pipeline progression, and commercial term sheet generation.

---

## 2. Environment Setup & Getting Started

### 2.1 Prerequisites
Ensure the host development environment meets the following specifications:
- **Node.js**: `v18.0.0` or higher (`v20.x` or `v22.x` recommended)
- **Package Manager**: `npm` v9+ (or `pnpm`)
- **Database**: PostgreSQL `v14.0` or higher (running on port `5432` or via cloud service such as Neon, AWS RDS, Supabase)
- **Git**: For version control

---

### 2.2 Step-by-Step Installation

#### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/fairway-crm.git
cd fairway-crm
```

#### Step 2: Configure Environment Variables

**Backend Environment (`backend/.env`):**
Create `backend/.env` (based on `backend/.env.example`):
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fairway_crm
JWT_SECRET=fairway-enterprise-secret-key-32-chars-minimum-entropy
```

> ⚠️ **CRITICAL SECURITY NOTE:** In `production`, the server will abort startup if `JWT_SECRET` is unset or left as the default example. Always set a strong, random 256-bit string in staging and production.

**Client Environment (`client/.env`):**
Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

---

#### Step 3: Install All Dependencies
From the repository root:
```bash
# Install root orchestration tools
npm install

# Install client and backend dependencies
npm run install:all
```

---

#### Step 4: Automatic Database Initialization & Schema Migration
Fairway CRM includes an automated, self-healing database initialization engine:
- Upon starting the backend, `initDatabase()` in `backend/src/config/db.ts` automatically connects to the default `postgres` maintenance database.
- It detects if the target database `fairway_crm` exists; if not, it automatically runs:
  ```sql
  CREATE DATABASE fairway_crm;
  ```
- It connects to `fairway_crm`, creates all 17 normalized tables, applies column migrations via `runAllSchemaFixes()`, and seeds default system roles (`super_admin`, `admin`, `sales`, `viewer`) and the default administrator account.

---

#### Step 5: Start Development Servers Concurrently
From the root directory:
```bash
npm run dev
```

This concurrently launches:
1. **Frontend (Vite dev server)**: [http://localhost:5173](http://localhost:5173)
2. **Backend (Express + Nodemon)**: [http://localhost:5000](http://localhost:5000)

**Default Demo Credentials:**
- **Email:** `admin@fairway.com`
- **Password:** `admin123`
- **Role:** `super_admin`

---

## 3. Codebase & Directory Structure

```
fireway-demo/
├── client/                                # React 18 + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── App.tsx                        # Master Router & Permission Gateway
│   │   ├── main.tsx                       # React DOM Bootstrapper
│   │   ├── index.css                      # Global Tokens, Themes, Layout CSS
│   │   ├── components/                    # Reusable ReUI & DataGrid components
│   │   │   └── reui/                      # Custom Phone, Select, DataGrid tables
│   │   └── modules/                       # Domain-Driven Architecture
│   │       ├── auth/                      # Login & authentication view
│   │       ├── calls/                     # Call logging & scheduling modals
│   │       ├── communications/            # Omnichannel client messages trail
│   │       ├── companies/                 # Multi-facility corporate accounts
│   │       ├── contacts/                  # Decision-makers & stakeholders
│   │       ├── core/                      # Global UI components, providers, types
│   │       │   ├── components/ui/         # Buttons, Badges, Modals, Comboboxes
│   │       │   ├── providers/             # AuthContext, ThemeContext, ToastContext
│   │       │   └── services/              # api.ts, inquiryService, propertyService
│   │       ├── dashboard/                 # Executive KPIs & deal velocity charts
│   │       ├── documents/                 # Blueprints, leases, term sheets storage
│   │       ├── import-export/             # Universal Excel/CSV data migration
│   │       ├── inquiries/                 # Leasing leads & technical requirements
│   │       ├── map/                       # Leaflet GIS Industrial Corridor Map
│   │       ├── pipeline/                  # Kanban Stage-Gate Board (@dnd-kit)
│   │       ├── profile/                   # User profile & account security
│   │       ├── properties/                # Grade-A warehouse parks inventory
│   │       ├── proposals/                 # Commercial proposals & PDF generator
│   │       ├── reports/                   # Executive reporting & conversion analytics
│   │       ├── settings/                  # User Management, Roles & Audit Logs
│   │       ├── site-visits/               # Warehouse inspections & tour scheduler
│   │       └── tasks/                     # Follow-ups & operational task engine
│   ├── package.json
│   └── vite.config.ts                     # Vite config with API proxy to :5000
│
├── backend/                               # Node.js + Express + TypeScript API Server
│   ├── src/
│   │   ├── config/
│   │   │   ├── index.ts                   # Environment variables & fail-fast checks
│   │   │   ├── db.ts                      # Connection pool & table bootstrap
│   │   │   └── migrate_all_schemas.ts     # Self-healing database migrations
│   │   ├── controllers/                   # Request handlers (20+ domain controllers)
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts         # Cryptographic JWT validation & RBAC
│   │   │   └── errorHandler.ts            # Global error handling & logging
│   │   ├── routes/                        # REST endpoint dispatchers
│   │   │   ├── index.ts                   # Master router attaching auth middleware
│   │   │   └── *.routes.ts                # Route modules for inquiries, users, etc.
│   │   ├── utils/                         # Password hashing, tokens, formatters
│   │   ├── app.ts                         # Express app, CORS whitelist, helmet
│   │   └── server.ts                      # HTTP Server listener & socket bind
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                                  # Project Documentation
│   ├── API_SPECIFICATION.md               # End-to-end API specification & schemas
│   ├── TECHNICAL_DOCUMENT_HLD_LLD.md      # HLD, LLD, and database architecture
│   └── KNOWLEDGE_TRANSFER.md              # Onboarding guide & operational KT
├── package.json                           # Root scripts (npm run dev, build, etc.)
└── README.md                              # Public project overview & badges
```

---

## 4. Key Workflows Every Developer Must Understand

### 4.1 Authentication & Security Model
1. **Never trust client-supplied identity headers**: In previous iterations, `x-user-role` or `x-user-id` could be sent by the frontend. In the hardened release, **these headers are strictly ignored**.
2. **Bearer Token flow**:
   - The user logs in via `POST /api/auth/login`.
   - The backend signs a JWT with the user's `id`, `email`, and `role`.
   - The client stores this token in `localStorage` under `fw_auth_token`.
   - In `client/src/modules/core/services/api.ts`, `getAuthHeaders()` attaches `Authorization: Bearer <token>` to every outgoing request.
3. **Permission Enforcement**:
   - Every protected route is guarded by `requirePermission(module, action)`.
   - Example:
     ```typescript
     router.post('/', requirePermission('inquiries', 'create'), createInquiry);
     router.delete('/:id', requirePermission('inquiries', 'delete'), deleteInquiry);
     ```

---

### 4.2 The Kanban Pipeline Drag & Drop Flow
The Kanban board on `/pipeline` (`PipelinePage.tsx`) allows moving deal cards across stages:
1. Powered by `@dnd-kit/core` using `PointerSensor` and `TouchSensor`.
2. **Click vs. Drag Differentiation**:
   - The pointer sensor uses `activationConstraint: { distance: 8 }`.
   - Clicking a card (< 8px displacement) triggers `onSelectInquiry(id)` to open the detail drawer.
   - Dragging a card (> 8px displacement) initiates the drag overlay.
3. **Stage Mutation**:
   - When a card is dropped over a column, `handleDragEnd` fires.
   - It sends `PATCH /api/inquiries/:id/stage` with the new stage key.
   - If dropped into `closed_lost`, the `LostReasonModal` is displayed to mandate a lost reason.
   - If dropped into `closed_won`, the `WonCelebrationModal` fires confetti animations.

---

### 4.3 Property & Inquiry Matching Algorithm
When an inquiry is ingested, the engine evaluates available Grade-A warehouse bays against the tenant's requirements:
$$\text{MatchScore} = w_1 \cdot S_{\text{area}} + w_2 \cdot S_{\text{height}} + w_3 \cdot S_{\text{floor}} + w_4 \cdot S_{\text{dock}} + w_5 \cdot S_{\text{budget}}$$
- Area threshold: Must be within $\pm 20\%$ of requested square footage.
- Clear height: Property height must be $\ge$ requested clear height.
- Corridor: Exact or adjacent corridor match.

---

## 5. Testing & Release Verification Checklist

Before releasing any changes to Staging or Production, follow this strict checklist:

- [ ] **1. TypeScript Static Typecheck (Client & Backend)**:
  ```bash
  # Client check
  cd client && npx tsc --noEmit

  # Backend check
  cd ../backend && npx tsc --noEmit
  ```
  *Requirement: Zero errors (Exit code 0).*

- [ ] **2. Production Bundle Compilation**:
  ```bash
  npm run build
  ```
  *Requirement: Clean Vite and TS build without bundling warnings.*

- [ ] **3. Security Regression Suite**:
  Run the automated security regression script:
  ```bash
  node backend/scratch/test_full_suite_and_db.mjs
  ```
  *Verifies: Unauthenticated requests return 401; spoofed headers fail; login produces valid Bearer tokens; GET endpoints are strictly read-only.*

- [ ] **4. Load Testing Benchmark**:
  Run Autocannon against the health and inquiry listing endpoints:
  ```bash
  npx autocannon -c 50 -d 30 -m GET http://localhost:5000/api/health
  npx autocannon -c 30 -d 30 -H "Authorization: Bearer <valid_jwt>" http://localhost:5000/api/inquiries
  ```
  *Pass Criteria: 0% error rate, throughput $> 800\text{ req/sec}$, $P_{99} < 100\text{ ms}$.*

---

## 6. Known Issues, Deprecations & Future Roadmap

| Area | Item Description | Priority | Target Milestone |
| :--- | :--- | :--- | :--- |
| **Dependency** | Replace CDN-hosted `xlsx` tarball in `client/package.json` with a pinned npm package. | Medium | v1.1.0 |
| **Multi-Tenancy** | Introduce strict database-level row tenant isolation (`tenant_id`) for multi-operator SaaS deployments. | High | v1.2.0 |
| **Telephony** | Integrate Twilio / Exotel webhooks for automated incoming call recording and transcription. | Medium | v1.3.0 |
| **ERP Sync** | Bi-directional SAP / Oracle NetSuite webhook integration for executed leasing contracts. | Low | v2.0.0 |

---

## 7. Escalation & Ownership Matrix

| Role | Name | Primary Contact | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Backend Technical Lead** | Devendra Joshi | `backend-lead@fairwaycrm.com` | API architecture, database integrity, security |
| **Frontend Lead** | Sneha Patel | `frontend-lead@fairwaycrm.com` | React architecture, UI/UX performance, Kanban |
| **DevOps & Platform Lead** | Amitav Sen | `devops@fairwaycrm.com` | CI/CD pipelines, AWS/Vercel infrastructure, PostgreSQL |
| **Product Owner** | Rajesh Pareek | `product-owner@fairwaycrm.com` | Industrial business requirements, client escalations |
