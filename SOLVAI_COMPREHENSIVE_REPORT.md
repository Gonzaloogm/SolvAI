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
- **Integrations:** Stripe (payments and data source), Xero (data source), Supabase (Auth/DB), Resend (Transactional Emails), and Google Cloud Storage (GCS). The system uses native GCS with v4 pre-signed URLs to ensure cross-cloud latency is eliminated and to strictly align with the 'Build with Gemini' ecosystem.

## 3. Current Implementation Status
The project has reached a mature state of integration, moving from MVP mocks to live end-to-end functionality:

- **Frontend UI/UX:** Complete, featuring a responsive design, dark mode, dynamic metric cards, and detailed report modals. Recent updates ensured visual consistency across all badge types (e.g., matching pill shapes and violet colors for Solvency, Rental, and Mortgage reports) and introduced conditional Mortgage Capacity Metrics to the detail views. The frontend has been fully unified with the backend, completely eradicating the legacy `mockApi.js`.
- **Backend & Database:** The async database session issues have been completely resolved, ensuring stable query execution. The Celery worker safely handles native framework (WeasyPrint) execution on macOS and deployed environments.
- **AI Generation:** The Gemini pipeline correctly accepts pre-computed financial summaries, strictly adheres to schema requirements, and falls back gracefully when needed. Expanded the prompt to support dedicated logic for Mortgage reports, fetching specific fields like Est. Max Mortgage and DTI limit.
- **PDF Engine & Storage:** Fully functional and produces robust explainability reports (including Profit & Loss statements). Fixed a critical Jinja templating bug (`endendfor`) that was causing HTTP 500 errors during generation. Furthermore, Google Cloud Storage (GCS) integration is now fully implemented to securely and permanently store generated PDF artifacts, transitioning away from pure in-memory streaming.
- **Production Deployment:** Successfully containerized and deployed to Google Cloud Platform (Cloud Run for services, Cloud SQL for PostgreSQL, and Memorystore for Redis). Necessary environment variables (including Resend keys and Frontend URL references) are securely injected.
- **Integrations:** Full Stripe integration is live, including checkout functionality and proper mapping of `pro` and `business` price IDs. 
- **Verification Portal:** QR codes in generated PDFs are fully operational, correctly pointing to the deployed frontend validation portal instead of `localhost`, enabling secure and instant report verification.

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
1. **Data Ingestion & Sandbox Reality:** The platform connects directly to the official OAuth2 Sandboxes for Xero and PayPal, ingesting real network traffic and validating authentic third-party payloads.
2. **AI Scoring Accuracy:** The demo environment successfully aggregates data to produce robust, high-scoring reports (e.g., scoring 82/100, 'Strong/APPROVE' rating, with a 4.62 Modified Z-Score) using Gemini 2.5 Flash, proving the engine's capability to process and reward healthy financial profiles.
3. **Lender Onboarding:** Secure initial partnerships with 2-3 alternative lenders willing to underwrite based on SolvAI's structured reports.
4. **Advanced AI Analytics:** Explore deeper explainability features and risk forecasting models using historical financial data.
5. **Compliance & Certifications:** Finalize SOC 2 Type I readiness and GDPR/PSD2 compliance audits to pave the way for wider enterprise adoption.
