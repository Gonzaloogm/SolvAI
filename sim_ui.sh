#!/bin/bash
STRIPE_KEY=$(grep STRIPE_DEMO_TEST_KEY .env.demo | cut -d "=" -f2)
EMAIL="test-$RANDOM@example.com"
TOKEN=$(curl -s -X POST http://localhost:8000/auth/register -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\", \"password\":\"Password123!\", \"full_name\":\"Test\", \"organization_name\":\"Test\"}" | jq -r '.access_token')

curl -s -X POST http://localhost:8000/data-sources/connect-stripe -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"api_key\":\"$STRIPE_KEY\"}" > /dev/null

REPORT_ID=$(curl -s -X POST http://localhost:8000/solvency-reports/generate -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"report_type\":\"full\"}" | jq -r '.id')
echo "Generated Report ID: $REPORT_ID"

for i in {1..20}; do
  STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/solvency-reports/$REPORT_ID | jq -r '.status')
  if [ "$STATUS" = "COMPLETED" ]; then
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/solvency-reports/$REPORT_ID > latest_report.json
    cat latest_report.json | jq .
    exit 0
  fi
  sleep 2
done
echo "Timeout. Status was: $STATUS"
