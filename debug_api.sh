#!/bin/bash
STRIPE_KEY=$(grep STRIPE_DEMO_TEST_KEY .env.demo | cut -d "=" -f2)
EMAIL="test-$RANDOM@example.com"
echo "Registering..."
REG_RESP=$(curl -s -X POST http://localhost:8000/auth/register -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\", \"password\":\"Password123!\", \"full_name\":\"Test\", \"organization_name\":\"Test\"}")
TOKEN=$(echo $REG_RESP | jq -r '.access_token')

echo "Connecting Stripe..."
curl -s -X POST http://localhost:8000/data-sources/connect/stripe -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"connection_details\": {\"api_key\":\"$STRIPE_KEY\"}}" | jq .

echo "Generating Report..."
REPORT_ID=$(curl -s -X POST http://localhost:8000/solvency-reports/ -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{}" | jq -r '.id')
echo "Report ID: $REPORT_ID"

for i in {1..20}; do
  STATUS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/solvency-reports/$REPORT_ID | jq -r '.status')
  if [ "$STATUS" = "COMPLETED" ]; then
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/solvency-reports/$REPORT_ID | jq .
    exit 0
  fi
  sleep 2
done
