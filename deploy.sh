#!/bin/bash
set -e

echo "Deploying migrate job from source..."
gcloud run jobs deploy solvai-migrate --source ./backend --project=solvai-prod --region=europe-west1 --quiet

echo "Executing migrations..."
gcloud run jobs execute solvai-migrate --project=solvai-prod --region=europe-west1 --wait

echo "Deploying backend API..."
gcloud run deploy solvai-api --source ./backend --project=solvai-prod --region=europe-west1 --quiet

echo "Building and deploying frontend..."
cd frontend
npm run build
gcloud run deploy solvai-frontend --source . --project=solvai-prod --region=europe-west1 --quiet

echo "DEPLOYMENT COMPLETE!"
