# Demo video script (under 3 minutes)

Target length **2:50** (Devpost's limit is 3:00). Narration is about 300 words (a little over 2 minutes at 140 words per minute), which leaves room for the on-screen actions. Record the screen at 1440×900 or 1920×1080, browser zoom 100%, light theme.

## Before recording (checklist)

- [ ] Demo data is fresh: `python scripts/seed_stripe.py --top-up` (Stripe; run it after the 1st of the month too, or the last complete month looks short) and a few days of `seed_paypal_sandbox.py` (PayPal). See [demo.md](demo.md). Re-run `create_demo_account.py` afterwards so the account reads the new data.
- [ ] The demo account exists and is Pro: `create_demo_account.py` (see [deploy-vm.md](deploy-vm.md)). Log in once to check that the dashboard loads.
- [ ] Delete old reports except one completed report, so the list is clean.
- [ ] Open a second browser profile logged into the PayPal **sandbox** buyer account ("John"), for scene 8.
- [ ] Close notifications, hide bookmarks, and use a clean browser window with only the SolvAI tab.
- [ ] Test the microphone. Record the voice-over separately if that is easier, and cut the screen recording to it.

## Scenes

| # | Time | On screen | Narration |
|---|---|---|---|
| 1 | 0:00–0:13 | Landing page hero, slow scroll to "No made-up numbers" | Banks score borrowers with explainable models the borrower never sees. If you're a freelancer with irregular income, you usually just get a "no", with no reason attached. |
| 2 | 0:13–0:25 | Back to the hero; click **Get your free report** → log in | SolvAI gives freelancers the report a lender would build, before they apply. Every score is explained, and every figure is traced back to real transactions. |
| 3 | 0:25–0:42 | **Data Sources**: Stripe and PayPal cards connected; hover over PayPal | It starts with the accounts you already get paid through. For PayPal we read the full payment history with the Transaction Search API, net of refunds, and count each paying client once. |
| 4 | 0:42–1:14 | **Dashboard** → **Generate Report**; the live terminal fills step by step | Generating a report runs a multi-agent pipeline, streamed live. A deterministic quant step computes the facts: volatility, trend, weak months, client concentration and payment integrity. A Gemini underwriter writes the report from three parallel samples, and an auditor checks every figure against those facts. Here it sent the first draft back, and approved the second. |
| 5 | 1:14–1:42 | **Reports** → open the report; scroll the narrative, then **Verified metrics** | The narrative quotes the verified metrics instead of inventing them. Each factor shows its value, a lender's threshold, and the real Stripe and PayPal transaction IDs behind it. If the data is short, the report says so. If there's none, it fails with a clear reason instead of guessing. |
| 6 | 1:42–1:58 | Click **Download PDF**; show the analytics page and the appendix; point at the QR code | The result is a lender-ready PDF, with an appendix of every cited payment. Its QR code opens the copy SolvAI holds, so a lender can compare the two. |
| 7 | 1:58–2:16 | **What-if simulator**: move *Smoother income* and *Top client share*; the Scenario column updates | What would change a lender's view? The simulator recomputes those same metrics from your own data as you move the levers. It's pure arithmetic, so it never invents a score. |
| 8 | 2:16–2:38 | **Account** → **Pay with PayPal** (Business) → PayPal sandbox approval → back to SolvAI, plan active | PayPal also powers billing. Pro and Business plans are PayPal Subscriptions: approve once on PayPal, and the plan activates as soon as SolvAI reads the active subscription back. Webhooks keep it in sync. |
| 9 | 2:38–2:50 | Back on the dashboard with the score | SolvAI: PayPal as the data and the payment rail, Gemini for the reasoning, and no made-up numbers. Freelancers deserve to see why. |

## Cutting notes

- Scene 4 is the "wow" moment. If the auditor approves first time, keep the take: drop "Here it sent the first draft back" and say "Here it approved the draft".
- Report generation takes about 40–70 seconds. Speed up the waiting part of scene 4 (2–4×) but keep each new terminal line readable for at least one second.
- Scene 8 involves a real sandbox payment: record it once in advance and cut it in, so a slow sandbox doesn't spoil the take.
- Upload to YouTube as **Unlisted** or **Public** (not Private), and paste the link into Devpost.
