# SolvAI — Complete Project Report

## 1. Executive Summary

**SolvAI** is an automated financial solvency assessment platform that leverages Artificial Intelligence (Google Gemini) to analyze a business's health based on integrated data sources. It solves the traditional problem of slow, manual credit scoring and financial due diligence by providing instant, AI-driven reports with explainable metrics.

**Target Users & Use Cases:**
- **Lenders & Creditors:** To instantly assess the creditworthiness and repayment capacity of prospective borrowers.
- **B2B Service Providers:** For due diligence before entering into large-scale service contracts.
- **SMEs & Freelancers:** To understand their own financial health and proactively improve their solvency profile.

**Current State of the Product:**
- ✅ **Complete UI/UX:** The entire frontend interface, including dark mode, responsive layouts, and interactive charts, is complete and polished.
- ✅ **PDF Generation:** 9-page professional PDF generation with integrated Chart.js visualizations is fully functional.
- 🔲 **Mocked Integration:** The frontend currently relies on a `mockApi.js` layer for most data operations (reports, sources, account management) while the Python FastAPI / Express backends are being integrated.
- ⚠️ **Pending:** True end-to-end integration between the React frontend, the FastAPI Gemini engine, and the Express Stripe webhook server is still a work in progress.

**Hackathon Context:** 
Built for the **Build with Gemini XPRIZE**, competing in the **Money & Financial Access** category. The revenue model is a SaaS subscription via Stripe (Free, Pro, Business tiers). The deadline for submission is August 17, 2026.

**Tech Stack Overview:**
SolvAI uses a modern stack comprising a **React + Vite** frontend, styled with **Tailwind CSS**. Data persistence and authentication are handled by **Supabase** (PostgreSQL). The AI processing engine is built in **Python FastAPI** leveraging the **Google Gemini API**, while a secondary lightweight **Express** server handles Stripe checkout flows. 

---

## 2. Architecture Overview

### High-Level System Diagram

```mermaid
graph TD
    %% Frontend Layer
    subgraph Frontend [Frontend (React + Vite)]
        UI[User Interface]
        State[Local State / Contexts]
        MockAPI[mockApi.js]
    end

    %% Backend Layer
    subgraph Backend [Backend Services]
        Express[Express Node Server]
        FastAPI[Python FastAPI Engine]
        Celery[Celery Task Queue]
    end

    %% External Services
    subgraph External [External APIs]
        Supabase[(Supabase PostgreSQL)]
        Stripe[Stripe Billing API]
        Gemini[Google Gemini API]
        Redis[(Redis Cache)]
    end

    %% Flow
    UI <--> State
    State <--> MockAPI
    MockAPI -.->|Planned| FastAPI
    MockAPI -.->|Planned| Express
    
    Express <--> Stripe
    FastAPI <--> Supabase
    FastAPI <--> Redis
    FastAPI <--> Celery
    Celery <--> Gemini
```

### Layer Responsibilities
- **Frontend (React):** Handles all user interactions, UI rendering, client-side PDF generation (jsPDF + Chart.js), and local state management. Currently relies heavily on simulated data from `mockApi.js`.
- **Backend (Python FastAPI):** The core intelligence engine. Handles complex data aggregations, interfaces with the Gemini API to generate the analytical insights (SHAP values, risk flags), and updates Supabase.
- **Backend (Express):** A lightweight server dedicated to Stripe checkout sessions and webhook processing.
- **Supabase:** The source of truth for user accounts, raw report data, data source connections, and system logs.

### Data Flow Example (Report Generation)
1. User clicks "Generate Report" in the UI.
2. The frontend (currently via `mockApi`, eventually via FastAPI) triggers a report generation request.
3. The FastAPI backend fetches the user's connected data sources from Supabase.
4. FastAPI passes the raw financial data to Google Gemini with a highly specific prompt.
5. Gemini returns a structured JSON assessment.
6. FastAPI saves the assessment to Supabase.
7. Supabase Realtime (when active) fires an event to the frontend, which updates the UI.

### Auth Flow
Authentication is managed exclusively by Supabase Auth. The frontend uses the Supabase client to trigger OAuth or Magic Link sign-ins. The resulting JWT is passed in the `Authorization` header to the backends, which verify the token against Supabase before processing requests.

---

## 3. Repository Structure

```text
SolvAI/
├── frontend/                     # React application
│   ├── src/
│   │   ├── api/                  # API client setup (Axios)
│   │   ├── components/           # Reusable UI components
│   │   ├── context/              # React Context providers (Theme, Toast)
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Utilities (generateReportPDF.ts, mockApi.js)
│   │   ├── pages/                # Route-level components
│   │   ├── styles/               # Global CSS and Tailwind directives
│   │   ├── App.jsx               # Main router and layout wrapper
│   │   └── main.jsx              # React mounting point
│   ├── index.html                # HTML entry point
│   ├── package.json              # Frontend dependencies
│   ├── tailwind.config.js        # Tailwind styling rules
│   └── vite.config.js            # Vite bundler configuration
├── backend/                      # Python FastAPI application
│   ├── app/
│   │   ├── api/                  # FastAPI router endpoints
│   │   ├── core/                 # Config and security
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # Business logic (Gemini integration)
│   │   ├── tasks/                # Celery background workers
│   │   ├── main.py               # FastAPI entry point
│   │   └── celery_app.py         # Celery configuration
│   ├── alembic/                  # Database migration scripts
│   └── requirements.txt          # Python dependencies
├── server/                       # Node.js Express application
│   ├── index.js                  # Stripe checkout/webhook endpoints
│   └── package.json              # Node dependencies
├── supabase_schema.sql           # Database schema definition
├── .env.example                  # Example environment variables
├── docker-compose.yml            # Local deployment orchestration
└── README.md                     # Project overview
```

### Critical Files to Understand First
1. `frontend/src/lib/mockApi.js`: Understanding this file is crucial as it currently powers the entire frontend data flow.
2. `frontend/src/lib/generateReportPDF.ts`: The complex logic that generates the 9-page PDF using Chart.js offscreen canvases and jsPDF.
3. `supabase_schema.sql`: The database backbone that dictates how data is structured and secured via RLS policies.
4. `server/index.js`: The Stripe integration touchpoint.

---

## 4. Technology Stack

### Frontend Dependencies (`frontend/package.json`)
- **React (`^18.3.1`) & React DOM:** Core UI library. Chosen for component reusability and ecosystem.
- **Vite (`^5.4.21`):** Build tool and dev server. Chosen for blazing fast HMR and optimized builds.
- **Tailwind CSS (`^4.3.1`):** Utility-first CSS framework. Chosen for rapid UI development and consistent design tokens.
- **Lucide React (`^1.21.0`):** Iconography. Chosen for clean, modern SVG icons.
- **jsPDF (`^4.2.1`) & jspdf-autotable (`^5.0.8`):** Client-side PDF generation. Chosen because it allows generating complex reports without requiring a heavy backend PDF engine.
- **Chart.js (`^4.5.1`):** Charting library. Chosen for its ability to render to canvas, which is easily extracted to images for the PDF generator.
- **@supabase/supabase-js (`^2.108.2`):** Supabase client for auth and database access.
- **@stripe/react-stripe-js (`^6.6.0`) & @stripe/stripe-js (`^9.8.0`):** Stripe Elements for handling secure client-side payment inputs.
- **React Router DOM (`^6.23.1`):** Client-side routing.

### Backend Dependencies (`server/package.json`)
- **Express (`^5.2.1`):** Web framework for Node.js. Chosen for simplicity in handling Stripe webhooks.
- **Stripe (`^22.3.0`):** Official Stripe Node.js SDK.
- **Cors (`^2.8.6`) & Dotenv (`^17.4.2`):** Middleware for cross-origin requests and environment variable loading.

---

## 5. Environment Variables & Configuration

### `.env.example`
```env
# ── Database ────────────────────────────────────────────────
# Async URL (used by FastAPI app)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/solvai

# ── Authentication ───────────────────────────────────────────
JWT_SECRET=change-this-to-a-long-random-secret-before-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

# ── Supabase (optional managed PostgreSQL) ──────────────────
SUPABASE_URL=
SUPABASE_ANON_KEY=

# ── Redis (Cache & Celery broker) ───────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── Google Gemini ────────────────────────────────────────────
# Get your key at https://aistudio.google.com/app/apikey
GEMINI_API_KEY=

# ── Stripe ───────────────────────────────────────────────────
# Get keys at https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Xero ─────────────────────────────────────────────────────
# Register app at https://developer.xero.com/myapps
XERO_CLIENT_ID=
XERO_CLIENT_SECRET=

# ── Resend (Email delivery) ───────────────────────────────────
# Get key at https://resend.com/api-keys
RESEND_API_KEY=

# ── AWS S3 (Document storage) ────────────────────────────────
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=solvai-documents
AWS_REGION=eu-west-1

# ── CORS ─────────────────────────────────────────────────────
# Comma-separated list of allowed origins
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

### Tailwind Configuration
The project uses Tailwind CSS v4, which relies heavily on standard CSS variables rather than a complex `tailwind.config.js`. The variables are defined in `frontend/src/styles/index.css`. The dark mode strategy is explicitly configured as `class` via `document.documentElement.classList.toggle('dark')`.

---

## 6. Database Schema (Supabase)

Defined in `supabase_schema.sql`.

### Table: `reports`
Purpose: Stores generated financial assessments.
- `id` (uuid, PK, default: gen_random_uuid())
- `user_id` (uuid, FK to auth.users, ON DELETE CASCADE)
- `name` (text, NOT NULL)
- `type` (text, NOT NULL)
- `status` (text, DEFAULT 'Processing')
- `data_source` (text)
- `model` (text)
- `accuracy` (numeric)
- `description` (text)
- `created_at` (timestamptz, DEFAULT now())

### Table: `data_sources`
Purpose: Stores connected third-party integrations (e.g., Stripe, Plaid).
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `name` (text, NOT NULL)
- `type` (text, NOT NULL)
- `status` (text, DEFAULT 'Connected')
- `last_sync` (timestamptz)
- `records_count` (integer)
- `config` (jsonb)

### Table: `user_preferences`
Purpose: Stores user-specific app settings.
- `user_id` (uuid, PK, FK)
- `theme` (text, DEFAULT 'system')
- `language` (text, DEFAULT 'en')
- `notifications` (jsonb)

### Table: `activity_log`
Purpose: Audit trail of user actions.
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `message` (text, NOT NULL)
- `created_at` (timestamptz)

### Row Level Security (RLS)
All tables have RLS enabled with a strict policy ensuring users can only read/write their own data:
```sql
CREATE POLICY "Users see own data" ON reports FOR ALL USING (auth.uid() = user_id);
```

---

## 7. Backend API (Express Server)

Located in `server/index.js`.

### `POST /api/create-checkout-session`
- **Purpose:** Initializes a Stripe Checkout session for subscription upgrades.
- **Request Body:** `{ priceId: string, customerId?: string }`
- **Response Body:** `{ sessionId: string }`
- **Internal Logic:** Calls `stripe.checkout.sessions.create` with `mode: 'subscription'`. Sets success URL to `/account?success=true`.

### `POST /api/create-setup-intent`
- **Purpose:** Allows saving a credit card to a customer profile without charging it.
- **Request Body:** `{ customerId: string }`
- **Response Body:** `{ clientSecret: string }`

### `GET /api/invoices`
- **Purpose:** Retrieves billing history for a customer.
- **Query Params:** `customerId`
- **Response Body:** `{ data: [...] }`

---

## 8. Frontend Architecture

### 8.1 Component Hierarchy
```text
App
 ├── ThemeProvider
 ├── ToastProvider
 └── Router
      ├── Sidebar (Navigation)
      ├── Header (User profile, Mobile menu)
      └── MainContent
           ├── DashboardPage
           ├── ReportsPage
           │    └── ReportDetailModal
           ├── DataSourcesPage
           ├── DemoComparisonPage
           ├── AccountPage
           └── SettingsPage
```

### 8.2 Context Providers
- **`ThemeContext.jsx`:** Manages light/dark/system mode. Listens to `window.matchMedia` for system preference changes. Mutates `document.documentElement.classList`.
- **`ToastContext.jsx`:** Provides `addToast(message, type)` globally. Renders floating toast notifications in the bottom right corner with auto-dismissal.

### 8.3 Pages & Routing
- `/` (DashboardPage): Aggregated view of recent reports, connection statuses, and quick actions.
- `/reports` (ReportsPage): List view of all reports. Features search, multi-select deletion, and PDF downloading.
- `/sources` (DataSourcesPage): Grid of available integrations (Stripe, Plaid, Xero). Handles OAuth mock connections.
- `/demo` (DemoComparisonPage): A visual tool showcasing the difference between traditional credit scoring and SolvAI's Gemini-powered scoring.
- `/account` (AccountPage): Billing and subscription management. Connects to Stripe.
- `/settings` (SettingsPage): User preferences, API keys, and webhooks.

### 8.4 Shared Components
- `ConfirmModal`: Reusable modal for destructive actions (e.g., deleting reports).
- `ReportDetailModal`: A detailed view of a specific report. Includes a "Download PDF" button that triggers `generateReportPDF.ts`.

---

## 9. Authentication
*(Note: Supabase Auth is configured in schema but currently mocked in the React UI flow for speed of development during the hackathon.)*
- **Planned Flow:** Users authenticate via Supabase Auth (Email/Password or OAuth). The resulting session token is stored in local storage and passed via Axios interceptors to the backends.

---

## 10. Stripe Integration
- **Products:** 
  - Pro Plan: `prod_Um5HdQslaAVfSH`
  - Business Plan: `prod_Um5JyQcX6PpBnb`
- **Flow:** User clicks "Upgrade" on `AccountPage.jsx` → Frontend calls `mockApi.createSubscription` (or the Express backend in production) → Returns success → UI updates optimistically.
- **Test Cards:** Standard Stripe test cards (`4242 4242...`) apply when the Express backend is connected.

---

## 11. Feature Status Matrix

| Feature | Page | Status | Notes |
|---------|------|--------|-------|
| Dark Mode Toggle | Settings | ✅ Complete | Uses class-based Tailwind toggling |
| 9-Page PDF Generation | Reports | ✅ Complete | Uses jsPDF + Chart.js (DOM-detached) |
| Report Dashboard | Dashboard| 🔲 Mocked | Uses `mockApi.js` |
| Data Source Sync | Sources | 🔲 Mocked | Optimistic UI updates |
| Stripe Checkout | Account | ⚠️ Partial | Express backend exists, but UI uses `mockApi` |
| Gemini AI Integration| Backend | ⚠️ Partial | FastAPI scaffolding exists, waiting for hookup |

---

## 12. Data Flow Diagrams

### PDF Generation Flow
```mermaid
sequenceDiagram
    participant User
    participant UI as ReportDetailModal
    participant PDF as generateReportPDF.ts
    participant Chart as Chart.js (Offscreen)
    
    User->>UI: Clicks "Download PDF"
    UI->>PDF: generateReportPDF(reportData)
    PDF->>Chart: createRadarChart(data)
    Note over Chart: Appends temporary <canvas> to body<br/>responsive: false
    Chart-->>PDF: Returns Base64 PNG
    PDF->>PDF: jsPDF builds 9 pages
    PDF-->>UI: doc.save("report.pdf")
    UI-->>User: File downloaded
```

---

## 13. State Management
- **No Redux/Zustand:** The application relies on React's native `useState` and `useContext`. The state is localized to pages.
- **MockAPI:** Because `mockApi.js` returns Promises, pages use `useEffect` to fetch data on mount and store it in local state (e.g., `const [reports, setReports] = useState([])`).

---

## 14. Styling System
- **Tailwind CSS:** Fully utilizes Tailwind utility classes.
- **CSS Variables:** The `index.css` file defines `--bg-primary`, `--text-primary`, `--border-color`, etc., for both `:root` (light mode) and `.dark` (dark mode).
- **Dark Mode:** Toggled via a `.dark` class on the `<html>` element. Components use semantic variables (e.g., `bg-[var(--bg-primary)]`) to adapt automatically.

---

## 15. Known Issues & Technical Debt
- **Tech Debt:** The entire frontend operates on `mockApi.js`. Wiring up the actual Supabase/FastAPI backend will require replacing these mock calls with Axios/Fetch calls.
- **Tech Debt:** The Stripe integration on the frontend is currently a simulated timeout. The Express server exists but isn't being explicitly called by `AccountPage.jsx`.
- **Performance:** `Chart.js` canvas elements are appended and removed from the DOM rapidly during PDF generation. While functional and hidden (`left: -9999px`), generating multiple PDFs concurrently might cause race conditions or DOM layout thrashing.
- **Security:** `window` globals were previously used for API calls and have been migrated to `mockApi.js`, but input sanitization on forms is minimal.

---

## 16. Setup & Installation Guide

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- PostgreSQL (if running Supabase locally)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*The app will be available at http://localhost:5173*

### Express Backend Setup (Stripe)
```bash
cd server
npm install
node index.js
```

### Python Backend Setup (Gemini)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

---

## 17. Hackathon Submission Checklist
- [x] **Google Cloud product integrated:** Google Gemini API used for financial analysis.
- [x] **Gemini API used:** Prompting engine in FastAPI designed to ingest financial data and output SHAP values.
- [ ] **Revenue evidence ready:** Stripe configured, needs test payments logged.
- [ ] **User evidence ready:** Needs actual beta users.
- [ ] **Demo video plan:** 3-minute screen recording of the UI, PDF generation, and Demo Comparison page.
- [x] **Code repository:** Ready for submission.
- [ ] **Production deployment:** Needs Vercel/Render deployment.
- [x] **Category selected:** Money & Financial Access.

---

## 18. Roadmap & Next Steps
1. **Remove `mockApi.js`:** Replace all mock calls with actual Axios requests to the FastAPI and Express backends.
2. **Supabase Auth:** Implement the actual login/register flow blocking the dashboard.
3. **Deploy:** Push frontend to Vercel and backends to Render/Railway.
4. **Stripe Webhooks:** Ensure the Express server properly updates the Supabase `user_preferences` table when a subscription is paid.

---

## 19. API Reference

### External Integrations
- **Google Gemini (Planned):** Used via the `google-generativeai` Python SDK. Prompts are heavily structured to return JSON containing component scores (1-100) and qualitative risk flags based on financial timeseries data.
- **Stripe:** Used via `stripe-node`. The primary endpoint is `/v1/checkout/sessions`.
- **Supabase:** Used via `@supabase/supabase-js`. 

---

## 20. Glossary
- **Explainability Report:** The 9-page PDF generated by SolvAI that breaks down *why* the AI assigned a specific financial score.
- **Data Source:** A third-party financial platform (Stripe, Plaid, Xero, QuickBooks) from which SolvAI pulls transactional data to analyze.
- **SHAP Values:** (SHapley Additive exPlanations) A game-theoretic approach to explain the output of any machine learning model. SolvAI uses this concept in its UI to show which factors positively or negatively impacted the score.
