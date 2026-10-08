# Loading Local Data into Production on Render (`dev` Branch)

These dump files restore the full local Fairway CRM dataset into your Render production deployment:

| File | Database | What's in it |
|---|---|---|
| `docs/fairway_intelligence.dump` | Intelligence service (Python/FastAPI) | 822 discovered companies, revenue (146), signals (123), opportunity scores (44), warehouse links (822), discovery runs (12) |
| `docs/fairway_crm.dump` | CRM backend (Node/Express) | 139 CRM companies (138 from AI Discovery), 45 active leads, 4 warehouses, activities, tasks, settings, pipeline stages |

Exported from PostgreSQL 16. Use the checksums in `docs/SHA256SUMS` to verify file integrity (`shasum -a 256 -c docs/SHA256SUMS` or `Get-FileHash docs\*.dump -Algorithm SHA256`).

> **Note on User Accounts:** Built-in seed accounts (`usr_amit_1`, `usr_aryan_1`, `usr_sales_1`, `usr_bhavya_1`, `usr_bhavya_2`) are created automatically by the backend on startup with standardized IDs. Leads and warehouses link up automatically once the backend restarts.

---

## 1. Prerequisites Before You Restore

1. **Code Deployed on Render:**
   - Git Repository: `https://github.com/dishantkasodariya/fairway-ai-crm`
   - Active Branch: `dev` (Ensure Render service settings have **Branch: dev** selected)
2. **PostgreSQL Client Tools Installed:**
   - PostgreSQL 16+ `pg_restore` and `psql` command-line tools.
   - Test by running: `pg_restore --version`
   - *Windows:* Installed via official PostgreSQL installer (added to PATH under `C:\Program Files\PostgreSQL\16\bin`).
   - *macOS:* `brew install postgresql@16`
   - *Ubuntu/Debian:* `sudo apt install postgresql-client-16`
3. **Render External Database URLs:**
   - In Render Dashboard: Select your PostgreSQL database $\rightarrow$ **Connect** $\rightarrow$ Copy the **External Database URL**.
   - Make sure `?sslmode=require` is present at the end of the URL.
   - If using `postgresql+psycopg2://...`, convert it to `postgresql://...` for `pg_restore`.

---

## 2. Setting Connection Environment Variables

### Windows PowerShell:
```powershell
$env:INTEL_DB="postgresql://USER:PASSWORD@HOST:PORT/fairway_intelligence?sslmode=require"
$env:CRM_DB="postgresql://USER:PASSWORD@HOST:PORT/fairway_crm?sslmode=require"
```

### Linux / macOS (Bash / Zsh):
```bash
export INTEL_DB="postgresql://USER:PASSWORD@HOST:PORT/fairway_intelligence?sslmode=require"
export CRM_DB="postgresql://USER:PASSWORD@HOST:PORT/fairway_crm?sslmode=require"
```

---

## 3. Step-by-Step Restoration Process

### Step 3.1: Deploy and Start Services on Render (Initial Boot)
1. In Render, ensure your services are pointed to the `dev` branch:
   - **`fairway-crm-backend`** (Web Service):
     - Root Directory: `backend`
     - Build Command: `npm install; npm run build`
     - Start Command: `npm start`
   - **`fairway-crm-client`** (Static Site):
     - Root Directory: `client`
     - Build Command: `npm install; npm run build`
     - Publish Directory: `dist`
   - **`fairway-intelligence`** (Web Service, optional if hosted on Render):
     - Root Directory: `intelligence`
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
2. Start both services once so that initial database structures and migrations run cleanly.

### Step 3.2: Restore the Intelligence Data

#### On Windows PowerShell:
```powershell
pg_restore --clean --if-exists --no-owner --no-acl -d $env:INTEL_DB docs\fairway_intelligence.dump
```

#### On Linux / macOS:
```bash
pg_restore --clean --if-exists --no-owner --no-acl -d "$INTEL_DB" docs/fairway_intelligence.dump
```

*Note: Once restored, restart the Intelligence service on Render.*

### Step 3.3: Restore the CRM Data

#### On Windows PowerShell:
```powershell
pg_restore --clean --if-exists --no-owner --no-acl -d $env:CRM_DB docs\fairway_crm.dump
```

#### On Linux / macOS:
```bash
pg_restore --clean --if-exists --no-owner --no-acl -d "$CRM_DB" docs/fairway_crm.dump
```

*Note: Immediately after restoring, click **Manual Deploy $\rightarrow$ Restart service** for `fairway-crm-backend` in Render. This automatically re-populates the standard users with verified credentials.*

---

## 4. Production Environment Variables (Render Dashboard)

### CRM Backend (`fairway-crm-backend`):
| Environment Variable | Recommended Value / Description |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` (or leave default assigned by Render) |
| `DATABASE_URL` | Render Internal Database URL for CRM (`postgresql://...`) |
| `CLIENT_URL` | `https://fairway-ai-crm.onrender.com` |
| `JWT_SECRET` | Strong random 64-character secret key |
| `JWT_EXPIRES_IN` | `7d` |
| `INTELLIGENCE_API_URL` | Intelligence service URL (e.g. `https://fairway-intelligence.onrender.com` or `http://localhost:8000`) |
| `INTELLIGENCE_API_KEY` | Must match `API_KEY` in the Intelligence service |
| `DISCOVERY_CRON_ENABLED` | `false` (keep disabled to avoid automatic Places API credit burn) |
| `TODAY_DIGEST_ENABLED` | `true` |

### Frontend Client (`fairway-crm-client`):
| Environment Variable | Value |
|---|---|
| `VITE_API_URL` | `https://fairway-crm-backend.onrender.com/api` |

### Intelligence Service (`fairway-intelligence`):
| Environment Variable | Description |
|---|---|
| `DATABASE_URL` | Render Internal Database URL for Intelligence DB |
| `API_KEY` | Shared secret key matching `INTELLIGENCE_API_KEY` |
| `PLACES_API` | Google Places API key for company discovery |
| `LLM_PROVIDER` | `groq`, `bedrock` or `openai` |
| `GROQ_API_KEY` | Groq API Key (if using Groq) |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI); optional `OPENAI_MODEL_BULK`, `OPENAI_MODEL_JUDGMENT` (default `gpt-6-luna`), `OPENAI_REASONING_EFFORT` (default `low`) |
| `SERPER_API_KEY` | Google search API key for company signals |
| `APOLLO_API_KEY` | Apollo.io API key for contact discovery |

---

## 5. Verification & Health Checks

Run these queries to verify your production database matches expected row counts:

### Intelligence DB Verification:
```sql
SELECT 
  (SELECT count(*) FROM companies) AS companies,
  (SELECT count(*) FROM company_warehouse_links) AS links,
  (SELECT count(*) FROM revenue_snapshots) AS revenue,
  (SELECT count(*) FROM signals) AS signals,
  (SELECT count(*) FROM opportunity_scores) AS scores,
  (SELECT version_num FROM alembic_version) AS migration;
-- Expected: companies 822 | links 822 | revenue 146 | signals 123 | scores 44 | migration b2d4f6a8c0e1
```

### CRM DB Verification:
```sql
SELECT 
  (SELECT count(*) FROM companies) AS companies,
  (SELECT count(*) FROM inquiries) AS leads,
  (SELECT count(*) FROM properties) AS warehouses,
  (SELECT count(*) FROM users) AS users,
  (SELECT count(*) FROM notifications) AS notifications;
-- Expected: companies 139 | leads 45 | warehouses 4 | users 5 | notifications 34
```

### UI Sanity Checks:
1. **Sales Pipeline Kanban (`/pipeline`):** Displays active deals distributed across stages.
2. **AI Discovery (`/discovery`):** Shows discovered accounts near Fairway industrial parks.
3. **Warehouse Parks (`/properties`):** Shows Fairway warehouse facilities (Olpad, Dahej, etc.).
4. **Notifications Bell:** Responds in ~4ms with 0 errors and displays live CRM notifications.
