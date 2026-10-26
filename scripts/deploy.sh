#!/bin/bash
# Manual deploy to Cloud Run (project solvai-prod, europe-west1).
# CI/CD equivalent: cloudbuild.yaml. Run from anywhere: ./scripts/deploy.sh
set -euo pipefail

PROJECT=solvai-prod
REGION=europe-west1
cd "$(dirname "$0")/.."

echo "Deploying migrate job from source..."
gcloud run jobs deploy solvai-migrate --source ./backend --project="$PROJECT" --region="$REGION" --quiet

echo "Executing migrations..."
gcloud run jobs execute solvai-migrate --project="$PROJECT" --region="$REGION" --wait

echo "Deploying backend API..."
gcloud run deploy solvai-api --source ./backend --project="$PROJECT" --region="$REGION" --quiet

echo "Building and deploying frontend..."
(cd frontend && npm run build && gcloud run deploy solvai-frontend --source . --project="$PROJECT" --region="$REGION" --quiet)

echo "Deployment complete."
