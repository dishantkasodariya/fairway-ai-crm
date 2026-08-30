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

## 🏗️ Repository Architecture

The repository is structured as a fullstack monorepo with distinct frontend and backend services:

```
fireway-demo/
├── client/                     # React 18 + Vite + Tailwind CSS Frontend
│   ├── public/                 # Static assets & icons
│   ├── src/
│   │   ├── App.tsx             # Main view router
│   │   ├── index.css           # Global design system & tokens
│   │   ├── main.tsx            # App bootstrapping
│   │   └── modules/            # Modular feature domains (companies, pipeline, tasks, etc.)
│   ├── package.json
│   └── vite.config.ts
├── backend/                    # Node.js + Express + TypeScript API Server
│   ├── src/
│   │   ├── config/             # Environment & server configuration
│   │   ├── controllers/        # Request handlers (health, companies, etc.)
│   │   ├── middleware/         # Error handler & request logging
│   │   ├── routes/             # RESTful API route definitions
│   │   ├── app.ts              # Express app setup & middleware
│   │   └── server.ts           # Server bootstrap & entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── package.json                # Root monorepo script runner
└── README.md
```

---

## 🚀 Getting Started

### 1. Run Both Frontend & Backend Concurrently (Root)
```bash
# Install root orchestration tools
npm install

# Start both backend (port 5000) and client (port 5173) simultaneously
npm run dev
```

### 2. Run Individually

**Client (Frontend):**
```bash
cd client
npm install
npm run dev
```

**Backend (API Server):**
```bash
cd backend
npm install
npm run dev
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
