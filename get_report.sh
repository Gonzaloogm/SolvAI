#!/bin/bash
API_URL="https://solvai-api-879357866699.europe-west1.run.app"
EMAIL="test-json-$(date +%s)@example.com"
STRIPE_KEY=$(grep STRIPE_DEMO_TEST_KEY .env.demo | cut -d "=" -f2)

echo "Registering..."
TOKEN=$(curl -s -X POST $API_URL/auth/register -H "Content-Type: application/json" -d "{\"email\": \"$EMAIL\", \"password\": \"Password123!\", \"organization_name\": \"Live API Org\"}" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "Connecting Stripe..."
curl -s -X POST $API_URL/data-sources/connect/stripe -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"connection_details\": {\"api_key\": \"$STRIPE_KEY\"}}" > /dev/null

echo "Generating Report..."
curl -s -X POST $API_URL/solvency-reports/ -H "Authorization: Bearer $TOKEN" > /dev/null

echo "Polling..."
for i in {1..15}; do
  REPORT=$(curl -s -X GET $API_URL/solvency-reports/ -H "Authorization: Bearer $TOKEN" | jq '.[0]')
  if [ "$REPORT" != "null" ]; then
    STATUS=$(echo $REPORT | jq -r '.status')
    if [ "$STATUS" = "COMPLETED" ]; then
      echo $REPORT | jq . > /Users/alumnoad/.gemini/antigravity/brain/f3d3a44d-c3a8-4d42-8a19-433414af8339/latest_report_live.json
      cat /Users/alumnoad/.gemini/antigravity/brain/f3d3a44d-c3a8-4d42-8a19-433414af8339/latest_report_live.json
      break
    fi
  fi
  sleep 4
done
