# Testing SolvAI

SolvAI runs on test-mode data here: a Stripe test account and a PayPal sandbox. No real money or personal financial data is involved.

**Live app:** `<APP_URL>`
**Promo code:** `<JUDGES_CODE>` (shared with judges in the submission's testing instructions)

## Five-minute path

1. Open the app and choose **Get your free report**. Sign up with any email and enter the promo code. It gives you the Pro plan, which includes the PDF. If you skip it, you can redeem it later under **Account → Billing**.
2. On the dashboard, click **Try with demo data**. It connects the demo Stripe account and PayPal sandbox; you need no keys.
3. Click **Generate Report** and watch the agents work in the live terminal. It takes about a minute.
4. Click **Open my report**, then open the report. Under **Verified metrics**, each figure shows its threshold and the real transaction IDs behind it.
5. Download the PDF and scan its QR code: it opens the copy SolvAI holds.
6. Open **What-if simulator** and move the sliders. The metrics are recomputed from the same data, with no AI and no invented score.

## PayPal Subscriptions

Under **Account**, choose **Pay with PayPal** on a plan above your current one and approve with a PayPal **sandbox** buyer account. No real payment is made. Sandbox buyer: `<SANDBOX_BUYER_EMAIL>` / `<SANDBOX_BUYER_PASSWORD>`.

## What to expect

- Scores come from an AI underwriter, so they can vary by a few points between runs on the same data. The verified metrics never change for the same data.
- The auditor may send a draft back for revision. That is the system working, and it adds a few seconds.
