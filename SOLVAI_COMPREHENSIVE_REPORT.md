# SolvAI — Comprehensive Project & Audit Report

**Date:** July 2026

## 1. Executive Summary
**SolvAI** is an automated financial solvency assessment platform leveraging Google Gemini to analyze a business's health based on integrated data sources. It is targeted at freelance creative professionals and service-based microbusinesses (0-5 employees) in the EU/UK who lack traditional credit histories, providing them with AI-native explainable solvency reports to present to alternative lenders.

The platform functions as a matchmaker and information broker, aggregating unstructured financial data (PDFs, CSVs, API feeds) to generate a human-readable, auditable credit narrative. This drastically reduces lender underwriting time while helping SMEs secure working capital faster.

## 2. Architecture & Technology Stack
SolvAI is built using a modern, scalable stack designed for AI integration and data security:

- **Frontend:** React 18, Vite, TailwindCSS 4. Deployed as a containerized Nginx app.
- **Backend:** Python 3.11+ with FastAPI, enabling high-performance async APIs.
- **Database:** PostgreSQL (via Supabase) with `pgvector` for AI embeddings, managed via SQLAlchemy 2.0 (asyncio).
- **Background Jobs:** Celery and Redis handle long-running tasks like AI analysis and PDF generation to prevent API blocking.
- **AI Engine:** Google Gemini (via `google-generativeai`) integrated with LangGraph to parse financial summaries into structured JSON outputs (SHAP values, risk flags, narrative).
- **PDF Generation:** WeasyPrint, Matplotlib, and Jinja2 on the backend; jsPDF and Chart.js on the frontend.
- **Integrations:** Stripe (payments and data source), Xero (data source), Supabase (Auth/DB), Resend (Transactional Emails), and AWS S3 (Document Storage).

## 3. Current Implementation Status
The project has reached a mature state of integration, moving from MVP mocks to live end-to-end functionality:

- **Frontend UI/UX:** Complete, featuring a responsive design, dark mode, dynamic metric cards, and detailed report modals. Recent updates ensured visual consistency across all badge types (e.g., matching pill shapes for Solvency, Rental, and Mortgage reports).
- **Backend & Database:** The async database session issues have been completely resolved, ensuring stable query execution. The Celery worker safely handles native framework (WeasyPrint) execution on macOS and deployed environments.
- **AI Generation:** The Gemini pipeline correctly accepts pre-computed financial summaries, strictly adheres to schema requirements, and falls back gracefully when needed.
- **PDF Engine:** Fully functional and produces robust 9-page explainability reports.
- **Production Deployment:** Successfully containerized and deployed to Google Cloud Platform (Cloud Run for services, Cloud SQL for PostgreSQL, and Memorystore for Redis). Necessary environment variables (including Resend keys) are securely injected.

## 4. Market Strategy & Competitors
- **Target Market:** $1.2B TAM / $180M SAM (EU/UK, 2024-2029).
- **Differentiators:** Continuous proactive financing matching and multi-source data aggregation, giving lenders an unprecedented view of a user's financial health. 
- **Competition:** Fundbox, Kabbage (Amex), and traditional banks either require extensive historical data, lock users into a specific payment ecosystem, or are not pure marketplaces.
- **Risks:** The primary risk involves lenders hesitating to trust unproven AI models, making explainable AI (XAI) and rigorous prompt testing absolute priorities.

## 5. Security & Regulatory Compliance
- Designed for SOC 2 Type I readiness.
- Endpoints enforce JWT authentication.
- Must navigate GDPR, PSD2 (Open Banking), and AMLD requirements before scaling to wide enterprise adoption.

## 6. Next Steps & Roadmap
1. **Frontend-Backend Unification:** Fully transition the React frontend from relying on `mockApi.js` to fetching live data from the deployed FastAPI backend.
2. **Expand Data Sources:** Implement live data fetching for Xero and PayPal (currently utilizing mock/synthetic fallback data).
3. **Lender Onboarding:** Secure initial partnerships with 2-3 alternative lenders willing to underwrite based on SolvAI's structured reports.
4. **Cloud Storage (S3):** Finalize AWS S3 bucket configuration to permanently store generated PDF artifacts instead of streaming them purely in-memory.
