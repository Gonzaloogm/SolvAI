# SolvAI Demo Instructions

Welcome to the SolvAI Demo! For the hackathon presentation, we want to show a real, end-to-end "Connect Your Stripe Account" flow to demonstrate our Explainable AI on real financial data.

## The Demo Account Key

During the demo, when you are prompted to connect a Stripe account, do **not** use the "mock" or "skip" option. Instead, copy and paste the **Stripe Test Secret Key** for the demo account.

> **Where to find the key:** The real demo key is stored in `.env.demo` at the project root (never committed to git). Ask a team member or check the team password manager for the value. It starts with `sk_test_...`.

```text
<YOUR_STRIPE_TEST_SECRET_KEY>
```

### Why this key?

This test mode key corresponds to a specifically seeded Stripe account that contains realistic transactions spanning exactly the last 12 months, with realistic clients and normal growth patterns.

**Note:** The demo account was completely wiped and freshly re-seeded with clean 12-month data on **June 20, 2026**.
**CRITICAL:** Do NOT run `seed_stripe.py` or any other seeding script again before the hackathon demo! Layering multiple seed runs will cause massive outliers and pollute the data.

By pasting this key into the UI:
1. The backend will securely encrypt and store it.
2. The Celery worker will securely query Stripe's live API directly.
3. The AI will ingest the real transaction data to generate a realistic solvency score and explainable narrative.

## Demo Flow Outline

1. **Sign up / Login**: Create a fresh account on the SolvAI platform.
2. **Connect Data Source**: Navigate to Data Sources, click **Stripe**, and paste the key from `.env.demo`.
3. **Generate Report**: Navigate to the Dashboard and click **Generate New Report**.
4. **Wait ~30s**: Watch the status indicator change from *Pending* to *Generating* to *Completed*.
5. **View Results**: Open the report to see the score, metrics, and the AI-generated narrative that explicitly references the seeded test transactions!

## Running E2E Tests

The E2E tests (`e2e_test.cjs`, `run-tests.js`) read the demo key from the `STRIPE_DEMO_TEST_KEY` environment variable. To run them:

```bash
# Load the key from .env.demo and run
export STRIPE_DEMO_TEST_KEY=$(grep STRIPE_DEMO_TEST_KEY .env.demo | cut -d '=' -f2)
node frontend/e2e_test.cjs
node run-tests.js
```
