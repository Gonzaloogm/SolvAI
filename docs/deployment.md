# Deployment (Google Cloud)

> The cheapest way to keep the demo online is a single VM with Docker Compose: see [deploy-vm.md](deploy-vm.md). This page describes the scalable Cloud Run setup.

Production runs in GCP project `solvai-prod`, region `europe-west1`.

| Component | Service |
|---|---|
| API (FastAPI + WebSocket) | Cloud Run `solvai-api` |
| Report worker (Celery) | Cloud Run `solvai-worker` (1 always-on instance, CPU not throttled) |
| Frontend (static build behind nginx) | Cloud Run `solvai-frontend` |
| Migrations | Cloud Run job `solvai-migrate` (`alembic upgrade head`) |
| Database | Cloud SQL for PostgreSQL 16 + pgvector |
| Broker / pub-sub | Memorystore for Redis (through VPC connector `solvai-connector`) |
| Secrets | Secret Manager |
| PDF storage | Cloud Storage bucket `solvai-documents-eu` |

## Pipelines

- **`cloudbuild.yaml`** is the full pipeline. It lints the frontend, builds and pushes the API image, then deploys the API, migration job and worker. It then builds the frontend with the API URL baked in, deploys it, and updates the API's `CORS_ORIGINS`.
- **`scripts/deploy.sh`** is a manual source-based deploy of the migration job, API and frontend. It does not deploy the worker.
- **`.github/workflows/ci.yml`** runs on every push and PR: ruff, migrations on a clean pgvector database, pytest, ESLint, the frontend build and the Docker builds.

## Required Cloud Run settings

- The API needs `--session-affinity` and `--timeout=3600`, or the report WebSocket disconnects mid-generation.
- `CORS_ORIGINS` must include every frontend URL in use: the canonical `https://solvai-frontend-879357866699.europe-west1.run.app` and any legacy `*.a.run.app` URL.
- The backend image installs Pango, Cairo and GDK-Pixbuf for WeasyPrint (see `backend/Dockerfile`).

## Secrets

Mounted with `--set-secrets` in `cloudbuild.yaml`:

| Env var | Secret |
|---|---|
| `DATABASE_URL` | `solvai-database-url` |
| `REDIS_URL` | `solvai-redis-url` |
| `JWT_SECRET` | `solvai-jwt-secret` |
| `ENCRYPTION_KEY` | `solvai-encryption-key` |
| `STRIPE_SECRET_KEY` | `solvai-stripe-secret-key` |
| `GEMINI_API_KEY` | `solvai-gemini-api-key` |
| `ADMIN_KEY` | `solvai-admin-key` |

Optional: `GEMINI_UNDERWRITER_MODEL` (default `gemini-2.5-flash`) and `GEMINI_LIGHT_MODEL` (default `gemini-3.5-flash-lite`) choose the model per agent.

Billing also needs `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID`, `STRIPE_BILLING_WEBHOOK_SECRET` and `STRIPE_WEBHOOK_SECRET`. Without the price IDs, checkout returns `503 Billing is not configured`.

The Stripe billing webhook points to `https://<api>/webhooks/stripe-billing` with these events:
`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

PayPal billing needs `PAYPAL_BILLING_CLIENT_ID`, `PAYPAL_BILLING_SECRET`, `PAYPAL_PRO_PLAN_ID`, `PAYPAL_BUSINESS_PLAN_ID` (created by `backend/scripts/setup_paypal_billing.py`) and `PAYPAL_WEBHOOK_ID`. Without them the "Pay with PayPal" buttons stay hidden. The webhook points to `https://<api>/webhooks/paypal-billing` with the `BILLING.SUBSCRIPTION.*` events (activated, updated, cancelled, suspended, expired, payment failed); every event is verified with PayPal's `verify-webhook-signature` API before it changes a plan.

Both Stripe and PayPal webhooks reject events while their secret or webhook ID is missing, so a misconfigured deploy can never be upgraded for free.

## Costs

Cloud SQL, Memorystore and the always-on worker bill even with zero traffic. Scale them down or stop them when the product is not in use.
