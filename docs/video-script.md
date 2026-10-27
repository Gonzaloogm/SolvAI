# Demo video script (under 3 minutes)

Target length **2:45**. Narration is about 390 words at a calm pace (around 140 words per minute). Record the screen at 1440×900 or 1920×1080, browser zoom 100%, light theme.

## Before recording (checklist)

- [ ] Demo data is fresh: `python scripts/seed_stripe.py --top-up` (Stripe) and a few days of `seed_paypal_sandbox.py` (PayPal). See [demo.md](demo.md).
- [ ] The demo account exists and is Pro: `create_demo_account.py` (see [deploy-vm.md](deploy-vm.md)). Log in once to check that the dashboard loads.
- [ ] Delete old reports except one completed report, so the list is clean.
- [ ] Open a second browser profile logged into the PayPal **sandbox** buyer account ("John"), for scene 7.
- [ ] Close notifications, hide bookmarks, and use a clean browser window with only the SolvAI tab.
- [ ] Test the microphone. Record the voice-over separately if that is easier, and cut the screen recording to it.

## Scenes

| # | Time | On screen | Narration |
|---|---|---|---|
| 1 | 0:00–0:15 | Landing page hero, slow scroll to "No made-up numbers" | Banks score borrowers with explainable credit models the borrower never sees. If you're a freelancer with irregular income from a handful of clients, you usually just get a "no", with no reason attached. |
| 2 | 0:15–0:30 | Back to the hero; click **Get your free report** → log in | SolvAI gives freelancers the report a lender would build, before they apply. Every score is explained, and every figure is traced back to real transactions. |
| 3 | 0:30–0:50 | **Data Sources**: Stripe and PayPal cards connected; hover over PayPal | It starts with the accounts you already get paid through. Here, a Stripe account and a PayPal business account. For PayPal we read the full payment history with the Transaction Search API, net of refunds, and count each paying client once. |
| 4 | 0:50–1:25 | **Dashboard** → **Generate Report**; the live terminal fills step by step | Generating a report runs a multi-agent pipeline, streamed live. First, a deterministic quant step computes the facts: income volatility, trend by regression, weak months, client concentration and payment integrity. Then a Gemini underwriter writes the report from three parallel samples, and an auditor checks every figure against those facts. Here it sent the first draft back, and approved the second. |
| 5 | 1:25–2:00 | **Reports** → open the report; scroll the narrative, then **Verified metrics** | The narrative quotes the verified metrics instead of inventing them. Each factor shows its value, the threshold a lender would use, and the real Stripe and PayPal transaction IDs behind it. When the history is short, as with this new PayPal account, the report says so and never extrapolates. If there's no data, the report fails with a clear reason instead of guessing. |
| 6 | 2:00–2:20 | Click **Download PDF**; show the analytics page and the appendix; point at the QR code | The result is a lender-ready PDF, with the analytics and an appendix of every cited payment. The QR code links to a verification page, so a lender can confirm the report is genuine. |
| 7 | 2:20–2:40 | **Account** → **Pay with PayPal** (Business) → PayPal sandbox approval → back to SolvAI, plan active | PayPal also powers billing. Pro and Business plans are PayPal Subscriptions: approve once on PayPal, and the plan activates as soon as SolvAI reads the active subscription back. Webhooks keep it in sync. |
| 8 | 2:40–2:50 | Back on the dashboard with the score | SolvAI: PayPal as the data and the payment rail, Gemini for the reasoning, and no made-up numbers. Freelancers deserve to see why. |

## Cutting notes

- Scene 4 is the "wow" moment. If the auditor approves first time, keep the take: drop "Here it sent the first draft back" and say "Here it approved the draft".
- Report generation takes about 30–45 seconds. Speed up the waiting part of scene 4 (2–4×) but keep each new terminal line readable for at least one second.
- Scene 7 involves a real sandbox payment: record it once in advance and cut it in, so a slow sandbox doesn't spoil the take.
- Upload to YouTube as **Unlisted** or **Public** (not Private), and paste the link into Devpost.
