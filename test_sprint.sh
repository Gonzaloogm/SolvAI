#!/bin/bash

BASE="https://solvai-api-879357866699.europe-west1.run.app"
FRONT="https://solvai-frontend-879357866699.europe-west1.run.app"

# Get production token
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@solvai.com","password":"SolvAI2026!"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token','WRONG_PWD'))")
echo "Auth: ${TOKEN:0:15}..."

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "## TEST 1 — STRIPE CHECKOUT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST $BASE/billing/create-checkout-session \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro"}'
echo -e "\nWebhook test:"
curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/billing/webhook \
  -H "Content-Type: application/json" -d '{}'

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "## TEST 2 — P&L STATEMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -o /dev/null -w "%{http_code}" $BASE/reports/pl-statement \
  -H "Authorization: Bearer $TOKEN"
echo -e "\nPDF Download:"
curl -s -o /tmp/pl_test.pdf -w "%{http_code}" $BASE/reports/pl-statement/pdf \
  -H "Authorization: Bearer $TOKEN"
echo -e "\nPDF size:"
ls -la /tmp/pl_test.pdf 2>/dev/null

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "## TEST 3 — QR CODE IN PDFs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
REPORT_ID=$(curl -s $BASE/solvency-reports/ \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json
try:
  reports=json.load(sys.stdin)
  if isinstance(reports, list):
    completed=[r for r in reports if r.get('status')=='COMPLETED']
    print(completed[0]['id'] if completed else 'NONE')
  else:
    print('ERROR')
except: print('ERROR')")
echo "Report: $REPORT_ID"

if [ "$REPORT_ID" != "NONE" ] && [ "$REPORT_ID" != "ERROR" ]; then
  curl -s -o /tmp/qr_test.pdf -w " HTTP: %{http_code}" $BASE/solvency-reports/$REPORT_ID/pdf -H "Authorization: Bearer $TOKEN"
  echo ""
  if command -v pdftotext &> /dev/null; then
    pdftotext /tmp/qr_test.pdf - | grep -i "localhost\|solvai-frontend" || echo "No URL found in text"
  else
    strings /tmp/qr_test.pdf | grep -i "localhost\|solvai-frontend" | head -n 5 || echo "No URL found in strings"
  fi
fi

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "## TEST 4 — LENDER PORTAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
VERIFY=$(curl -s -X POST $BASE/verify/request \
  -H "Content-Type: application/json" \
  -d '{
    "applicant_email": "applicant@test.com",
    "requester_name": "Test Agent",
    "requester_company": "Test Agency SL",
    "requester_email": "agent@test.com",
    "monthly_rent": 1200
  }')
echo "Verify response: $VERIFY"

REQUEST_ID=$(echo $VERIFY | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('request_id', d.get('id','ERROR')))" 2>/dev/null)
echo "Request ID: $REQUEST_ID"

TOKEN_VAL=$(echo $VERIFY | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token','NO_TOKEN'))" 2>/dev/null)
echo "Token: $TOKEN_VAL"

if [ "$TOKEN_VAL" != "NO_TOKEN" ] && [ "$TOKEN_VAL" != "" ]; then
  echo "Authorize HTTP:"
  curl -s -o /dev/null -w "%{http_code}" $BASE/verify/authorize/$TOKEN_VAL
fi

if [ "$REQUEST_ID" != "ERROR" ] && [ "$REQUEST_ID" != "" ]; then
  echo -e "\nStatus HTTP:"
  curl -s -o /dev/null -w "%{http_code}" $BASE/verify/status/$REQUEST_ID
fi

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "## TEST 5 — SCORE SIMULATOR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST $BASE/simulate/score \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_revenue": 4500,
    "revenue_consistency": "medium",
    "num_clients": 5,
    "months_history": 12,
    "top_client_pct": 28
  }' | python3 -c "import sys,json
try:
  d=json.load(sys.stdin)
  print(f\"Score: {d.get('overall_score','ERROR')}\")
  print(f\"Rating: {d.get('rating','ERROR')}\")
  print(f\"Insight: {str(d.get('key_insight','ERROR'))[:80]}\")
except:
  print('Failed to parse JSON')
"

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "## TEST 6 — FRONTEND PAGES ACCESSIBLE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for PAGE in "" "login" "verify" "demo"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" $FRONT/$PAGE)
  ICON=$([ "$STATUS" = "200" ] && echo "✅" || echo "❌")
  echo "$ICON /$PAGE → $STATUS"
done
