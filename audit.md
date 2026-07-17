# SolvAI Project Audit & Status Report

## 1. Executive Summary & Current State
**Current State:** MVP Complete & Deployed. 
SolvAI is a fully integrated, automated financial solvency assessment platform. It successfully aggregates financial data (e.g., from Stripe), processes it via Google Gemini 2.5 Pro/Flash, and generates detailed, explainable solvency reports for alternative lenders and microbusinesses.
Recent updates have unified the frontend with the live backend, eradicating mocks, ensuring async database stability, implementing Celery background tasks for AI/PDF generation, and transitioning to Google Cloud Storage (GCS) for permanent PDF artifact storage. The application is containerized and ready for SOC 2 Type I readiness audits.

## 2. System Architecture
SolvAI uses a modern, scalable, AI-native stack:

*   **Frontend**: React 18 + Vite, using React Router for navigation and Vanilla CSS (with design tokens) for styling. Connects to the backend via Axios.
*   **Backend**: Python 3.11 with FastAPI. It provides high-performance asynchronous REST endpoints.
*   **Database**: PostgreSQL managed via SQLAlchemy 2.0 (asyncio) and Alembic for migrations.
*   **Background Processing**: Redis + Celery. Handles long-running AI generation and PDF rendering tasks asynchronously, preventing API timeouts.
*   **AI Engine**: Google Gemini (via `google-generativeai`). Parses financial summaries into structured JSON (SHAP values, risk flags, narrative).
*   **PDF Engine**: WeasyPrint + Jinja2 (Backend) creating auditable explainability reports, securely stored in GCS via pre-signed URLs.
*   **Integrations**: Stripe (billing and data ingestion), Supabase (Auth/DB), Resend (Emails).

## 3. Core Workflow
1.  **Onboarding & Auth**: User registers/logs in via JWT-based auth and creates an Organization.
2.  **Data Ingestion**: User connects financial data sources (e.g., Stripe, Xero, PayPal, Manual uploads). The system securely authenticates and ingests structured financial data.
3.  **Report Generation (Async)**: 
    *   User triggers a solvency report.
    *   The API enqueues a Celery task and immediately returns a task ID to the frontend.
    *   The Celery worker aggregates the financial data, prompts the Gemini model with a structured schema, and receives a JSON-formatted solvency analysis.
    *   The worker uses WeasyPrint to generate a PDF report containing the AI narrative, charts, and a verification QR code, uploading it to GCS.
4.  **Presentation**: The frontend polls the backend for task completion and displays the final solvency score, metrics, and narrative in a dashboard, allowing PDF downloads.
5.  **Lender Matching**: Based on the solvency score, the system matches the user with potential alternative lenders.

## 4. Comprehensive File Analysis

### Root Files
*   `.env`, `.env.example`, `.env.demo`: Environment variable configurations for different deployment contexts.
*   `docker-compose.yml`: Docker composition for local development (API, Celery, Redis, PostgreSQL).
*   `Dockerfile` (Backend/Frontend): Container build instructions for GCP deployment.
*   `README.md`, `QUICKSTART.md`, `EXECUTION_GUIDE.md`: Project documentation and setup instructions.
*   `SOLVAI_COMPREHENSIVE_REPORT.md`: Previous detailed audit and market strategy report.
*   `AUDIT_RESPONSE.md`: Terminal grep outputs from previous security/codebase audits.
*   `agent.py`: Orchestration script or agent-based execution wrapper.

### Backend (`/backend/`)
#### Core & API
*   `app/main.py`: FastAPI application entry point and router registration.
*   `app/celery_app.py`: Celery worker configuration and initialization.
*   `app/core/config.py`: Environment variable and application settings management.
*   `app/core/database.py`: Async SQLAlchemy engine and session management.
*   `app/core/security.py`: Password hashing and JWT token generation/validation utilities.
*   `app/api/auth.py`: Endpoints for user registration, login, and token refresh.
*   `app/api/users.py`: Endpoints for retrieving and managing user profiles.
*   `app/api/organizations.py`: Endpoints for managing company/organization details.
*   `app/api/data_sources.py`: Endpoints to connect and sync external data (Stripe, Xero, etc.).
*   `app/api/solvency_reports.py`: Endpoints to trigger and retrieve AI solvency reports.
*   `app/api/lender_matching.py`: Endpoints for matching profiles with lender criteria.
*   `app/api/billing.py`: Endpoints for Stripe checkout and subscription management.

#### Services & Tasks
*   `app/services/gemini_service.py`: Integrates with Google Gemini API to generate structured financial analysis.
*   `app/services/pdf_service.py`: Handles PDF generation using WeasyPrint and Jinja2 templates.
*   `app/services/stripe_service.py`: Interacts with Stripe APIs for checkout and data retrieval.
*   `app/services/lender_service.py`: Logic for matching solvency scores to lender profiles.
*   `app/tasks/report_generation.py`: Celery tasks for executing the long-running AI report generation pipeline asynchronously.

#### Models & Schemas
*   `app/models/*.py` (user, organization, solvency_report, etc.): SQLAlchemy ORM definitions for database tables.
*   `app/schemas/*.py` (user, auth, solvency_report, etc.): Pydantic models for request/response validation and OpenAPI documentation.
*   `alembic/`: Database migration scripts and configuration.

### Frontend (`/frontend/`)
#### Core & Configuration
*   `vite.config.js`: Vite build and development server configuration.
*   `package.json`: NPM dependencies and run scripts.
*   `src/main.jsx`: React application mount point and context providers.
*   `src/App.jsx`: Main routing component defining public and protected routes.
*   `src/api/client.js`: Axios HTTP client configuration with automatic JWT injection and interceptors.
*   `src/styles/index.css`: Global CSS and design token definitions.

#### Pages
*   `src/pages/Dashboard.jsx` & `DashboardPage.jsx`: Main user dashboard showing high-level metrics.
*   `src/pages/Login.jsx` & `Register.jsx`: Authentication screens.
*   `src/pages/DataSources.jsx` & `DataSourcesPage.jsx`: Interface for connecting external financial tools.
*   `src/pages/Reports.jsx` & `ReportsPage.jsx`: List of generated solvency reports.
*   `src/pages/ReportDetail.jsx`: Detailed view of a specific report (score, narrative, metrics).
*   `src/pages/Account.jsx` & `AccountPage.jsx`: User profile and subscription settings.
*   `src/pages/LandingPage.jsx`: Public-facing marketing page.

#### Components
*   `src/components/Sidebar.jsx`: Main navigation menu for authenticated users.
*   `src/components/MetricCard.jsx`: Reusable UI component for displaying KPI metrics.
*   `src/components/SolvencyGauge.jsx`: Visual representation of the AI-generated solvency score.
*   `src/components/ReportDetailModal.jsx`: Modal view for deep-diving into report data.
*   `src/components/StatusBadge.jsx`: UI badge for showing connection/report statuses.
*   `src/components/IntelligenceTerminal.jsx`: Terminal-like UI for displaying system logs/status.

#### Hooks & Context
*   `src/hooks/useReports.js`, `useDataSources.js`: Custom React hooks for fetching and managing state.
*   `src/context/ThemeContext.jsx`: Manages light/dark mode state.
*   `src/context/ToastContext.jsx`: Provides global toast notification functionality.

### Scripts & Testing
*   `backend/test_*.py` & `backend/scripts/*.py`: Various utility scripts for testing endpoints, PDF generation, Gemini engine, and WebSockets.
*   `frontend/test-*.cjs` & `frontend/e2e_test.cjs`: Frontend E2E tests and Puppeteer PDF generation scripts.
*   `take-screenshots.js` & `run_live_verification.js`: Utility scripts for generating UI screenshots and verifying live flows.
