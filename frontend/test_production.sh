#!/bin/bash
set -e

# Get API URL
API_URL=$(gcloud run services describe solvai-api --region=europe-west1 --project=solvai-prod --format="value(status.url)")
echo "Testing against $API_URL"

# Get token for demo account
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@solvai.com", "password":"SolvAI2026!"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token','WRONG_PASSWORD'))")

echo "Got Token: ${TOKEN:0:10}..."

# Test 3C: Create test alert
echo "Creating test alert..."
curl -s -X POST "$API_URL/alerts/test" -H "Authorization: Bearer $TOKEN"
echo -e "\n"

# Test 3B: Check alerts
echo "Checking alerts..."
curl -s "$API_URL/alerts/" -H "Authorization: Bearer $TOKEN"
echo -e "\n"

echo "Done"
