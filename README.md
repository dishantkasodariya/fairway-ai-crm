# 🏢 Fairway CRM — Industrial Warehouse Operations & Leasing

Fairway CRM is a high-performance, modular enterprise web application engineered for industrial warehouse operators, logistics park managers, and commercial leasing teams across India (Gujarat PCPIR, Sanand GIDC, Vapi-Surat, Mumbai-Bhiwandi, and Pune corridors).

---

## 🌟 Key Features

- **📊 Sales & Operations Dashboard**: Real-time KPI summaries, active pipeline valuation, revenue projections, and immediate operational task follow-ups.
- **📑 Inquiries & Lead Management**: End-to-end inquiry lifecycle tracking from requirements capture to property matching, proposal generation, and deal closure.
- **🏭 Multi-Facility Company Master**: Centralized accounts database with linked manufacturing plants, warehouses, distribution centers, and primary contact directories.
- **📌 Pipeline Kanban Board**: Drag-and-drop opportunity progression across custom configurable stages with real-time deal metrics.
- **🗺️ Interactive Corridors Map**: Leaflet-powered GIS mapping of Grade-A warehouse parks and client facilities with quick corridor jumps.
- **🏢 Grade-A Warehouse Property Inventory**: Technical specifications, clear heights, FM2 flooring, dock configurations, and leasing commercials.
- **⚡ Follow-up & Task Engine**: Task scheduling with automated urgency alerts, overdue tracking, and company timeline sync.
- **📄 Proposals & Commercial Term Sheets**: Standardized proposal creation, PDF downloads, and term sheet lifecycle management.
- **📥 Excel / CSV Data Migration Wizard**: Step-by-step spreadsheet importer with automatic field mapping and data validation.
- **🛡️ Role-Based Access Control (RBAC)**: Fine-grained permission matrix across Super Admin, Admin, Sales, and Viewer personas.

---

## 🏗️ Feature-Based Modular Architecture

The codebase follows a scalable **feature-based modular architecture** under `src/modules/`:

```
src/
├── App.tsx                           # Pure router / view orchestrator
├── index.css                         # Global CSS & Tailwind design tokens
├── main.tsx                          # App bootstrapping & storage initialization
└── modules/
    ├── core/                         # Single shared foundation module
    │   ├── components/
    │   │   ├── ui/                   # Shared UI primitives (Button, Modal, Card, Badge, etc.)
    │   │   ├── CommandPalette.tsx    # ⌘K Global search dialog
    │   │   ├── LostReasonModal.tsx   # Mandatory lost opportunity capture
    │   │   ├── NotificationPopover.tsx
    │   │   └── WonCelebrationModal.tsx
    │   ├── data/                     # Seed demonstration datasets
    │   ├── lib/                      # cn() class merge utilities
    │   ├── pages/                    # 404 Fallback page
    │   ├── providers/                # Auth, Notification, and Toast contexts
    │   ├── services/                 # LocalStorage persistence engine
    │   ├── types/                    # Shared TypeScript data models
    │   ├── ui/                       # Global AppShell, Sidebar, and Topbar
    │   └── utils/                    # Currency (INR), Area (sq.ft), Date formatters
    ├── companies/                    # Company accounts & facility management
    ├── dashboard/                    # Executive KPI dashboard
    ├── import-export/                # CSV migration wizard
    ├── inquiries/                    # Lead management & stepper wizard
    ├── map/                          # India industrial corridor map
    ├── pipeline/                     # Kanban board
    ├── properties/                   # Warehouse park catalog
    ├── proposals/                    # Commercial term sheets
    ├── reports/                      # Analytics & performance metrics
    ├── settings/                     # User management & RBAC matrix
    ├── site-visits/                  # Inspection scheduling
    └── tasks/                        # Follow-up touchpoint engine
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** / **yarn** / **pnpm**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/fairway-crm.git

# Navigate into project directory
cd fairway-crm

# Install dependencies
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
```

The output bundle will be generated in the `dist/` directory.

---

## ☁️ Deploying to Vercel

Fairway CRM is pre-configured for instant zero-configuration deployment on **Vercel**:

### Option 1: Git Integration (Recommended)
1. Push your repository to **GitHub** / **GitLab** / **Bitbucket**.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Vercel will automatically detect **Vite**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**. The included `vercel.json` ensures all Single Page Application (SPA) routes resolve seamlessly.

### Option 2: Vercel CLI
```bash
# Install Vercel CLI globally (if not already installed)
npm i -g vercel

# Deploy directly from terminal
vercel
```

---

## 🛠️ Technology Stack

- **Framework**: React 18 (TypeScript)
- **Bundler & Tooling**: Vite 6
- **Styling**: Tailwind CSS (Tailored Industrial Color Palette)
- **Icons**: Lucide React
- **Mapping**: Leaflet & React-Leaflet
- **Animations & Effects**: Canvas Confetti
- **Class Utilities**: clsx & tailwind-merge

---

## 📄 License

Proprietary © Fairway Logistics & Warehouse Operations. All rights reserved.
