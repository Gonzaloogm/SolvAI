#!/bin/bash
echo "=== CLOUD SQL INSTANCES ==="
gcloud sql instances describe solvai-db \
  --project=solvai-prod \
  --format="table(name,settings.tier,settings.dataDiskSizeGb,state,settings.activationPolicy)"

echo "=== CLOUD RUN SERVICES ==="
gcloud run services list \
  --project=solvai-prod --region=europe-west1 \
  --format="yaml" | grep -E "name:|memory:|cpu:|minScale|maxScale|containerConcurrency"

echo "=== CLOUD STORAGE BUCKETS ==="
for bucket in $(gcloud storage buckets list --project=solvai-prod --format="value(name)"); do
  echo "Bucket: $bucket"
  gcloud storage du gs://$bucket \
    --summarize 2>/dev/null || echo "  (empty or error)"
done

echo "=== CLOUD BUILD HISTORY ==="
gcloud builds list --project=solvai-prod \
  --limit=10 \
  --format="table(id,status,duration,createTime)" \
  2>/dev/null | head -20

echo "=== BILLING ACCOUNTS ==="
gcloud billing accounts list \
  --format="table(name,displayName,open)"
