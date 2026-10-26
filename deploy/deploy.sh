#!/bin/bash
# Build and (re)start the production stack on the VM, then check it is reachable.
# Run from anywhere inside the repo: ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env.prod ]; then
  echo "Missing deploy/.env.prod: cp deploy/.env.prod.example deploy/.env.prod and fill it in." >&2
  exit 1
fi
DOMAIN=$(grep -E '^DOMAIN=' .env.prod | cut -d= -f2-)
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file .env.prod)

git -C .. pull --ff-only || echo "git pull skipped (local changes or detached HEAD)"
"${COMPOSE[@]}" up -d --build --remove-orphans
"${COMPOSE[@]}" ps

echo "Waiting for https://$DOMAIN/api/health ..."
for _ in $(seq 1 30); do
  if curl -fsS "https://$DOMAIN/api/health" >/dev/null 2>&1; then
    echo "SolvAI is up: https://$DOMAIN"
    exit 0
  fi
  sleep 5
done
echo "Not reachable yet. Check: ${COMPOSE[*]} logs --tail=100 caddy api" >&2
exit 1
