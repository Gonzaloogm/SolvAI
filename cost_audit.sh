#!/bin/bash
echo "=== CLOUD RUN SERVICES ==="
gcloud run services list \
  --project=solvai-prod \
  --region=europe-west1 \
  --format="table(name,spec.template.spec.containers[0].resources.limits.memory,spec.template.spec.containers[0].resources.limits.cpu)"

echo ""
echo "=== CLOUD SQL INSTANCES ==="
gcloud sql instances list --project=solvai-prod \
  --format="table(name,settings.tier,state)"

echo ""
echo "=== CLOUD STORAGE BUCKETS ==="
gcloud storage buckets list --project=solvai-prod

echo ""
echo "=== BILLING BUDGETS ==="
gcloud billing budgets list \
  --billing-account=$(gcloud billing accounts list \
  --format="value(name)" | head -1) 2>/dev/null

echo ""
echo "=== SQL INSTANCE STATUS ==="
gcloud sql instances describe solvai-db \
  --project=solvai-prod \
  --format="value(state,settings.activationPolicy)"
