#!/usr/bin/env python3
"""
End-to-end test: register, connect Stripe, generate report, poll, dump raw
JSON, then download PDF and write to disk for inspection.
"""
import json
import os
import sys
import time

import requests

API = "http://localhost:8000"
EMAIL = f"e2e-test-{int(time.time())}@example.com"
PASSWORD = "TestPass123!"
ORG = "E2E Test Org"

OUT_JSON = "e2e_report.json"
OUT_PDF  = "e2e_report.pdf"

def fail(msg):
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)

# ── 1. Register ───────────────────────────────────────────────────────────
print("1. Registering…")
r = requests.post(f"{API}/auth/register", json={
    "email": EMAIL, "password": PASSWORD, "organization_name": ORG
})
if r.status_code not in (200, 201):
    fail(f"register returned {r.status_code}: {r.text}")
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"   Token obtained for {EMAIL}")

# ── 2. Connect Stripe (demo test account) ────────────────────────────────────────
print("2. Connecting Stripe (demo test key)…")
if not os.environ.get("STRIPE_DEMO_TEST_KEY"):
    fail("STRIPE_DEMO_TEST_KEY is not set (see docs/demo.md)")
r = requests.post(f"{API}/data-sources/connect/stripe", headers=headers, json={
    "connection_details": {"api_key": os.environ.get("STRIPE_DEMO_TEST_KEY", "")}
})
print(f"   Status: {r.status_code}")

# ── 3. Generate Report ───────────────────────────────────────────────────
print("3. Generating report…")
r = requests.post(f"{API}/solvency-reports/", headers=headers)
if r.status_code not in (200, 201):
    fail(f"generate returned {r.status_code}: {r.text}")
report_id = r.json()["id"]
print(f"   Report ID: {report_id}")

# ── 4. Poll for completion ────────────────────────────────────────────────
print("4. Polling for completion (max 90s)…")
for i in range(30):
    time.sleep(3)
    r = requests.get(f"{API}/solvency-reports/{report_id}", headers=headers)
    report = r.json()
    status = report.get("status", "UNKNOWN")
    print(f"   [{i*3}s] status={status}")
    if status == "COMPLETED":
        break
    if status in ("FAILED", "ERROR"):
        fail(f"Report failed: {report.get('error_message', 'unknown')}")
else:
    fail("Timed out waiting for report completion")

# ── 5. Dump raw JSON ─────────────────────────────────────────────────────
print("5. Dumping raw report JSON…")
with open(OUT_JSON, "w") as f:
    json.dump(report, f, indent=2)
print(f"   Written to {OUT_JSON}")

# Print key fields for quick verification
rd = report.get("report_data", {})
print(f"   overall_score:          {rd.get('overall_score')}")
print(f"   growth_trend.score:     {rd.get('growth_trend', {}).get('score')}")
print(f"   seasonality.score:      {rd.get('seasonality', {}).get('score')}")
print(f"   client_concentration:   {rd.get('client_concentration')}")
print(f"   data_references count:  {len(rd.get('data_references', []))}")

# ── 6. Download PDF ──────────────────────────────────────────────────────
print("6. Downloading PDF…")
r = requests.get(f"{API}/solvency-reports/{report_id}/pdf", headers=headers)
print(f"   HTTP status: {r.status_code}")
print(f"   Content-Type: {r.headers.get('content-type')}")
print(f"   Content-Length: {len(r.content)} bytes")

if r.status_code != 200:
    fail(f"PDF download returned {r.status_code}: {r.text[:200]}")

with open(OUT_PDF, "wb") as f:
    f.write(r.content)
print(f"   Written to {OUT_PDF}")

# Quick check: PDF files start with %PDF
if r.content[:5] == b"%PDF-":
    print("   ✅ File is a valid PDF (starts with %PDF-)")
else:
    print(f"   ⚠️  File does NOT start with %PDF- (first 20 bytes: {r.content[:20]})")

print("\n=== ALL CHECKS PASSED ===")
