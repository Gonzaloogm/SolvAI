#!/bin/bash
# Dump the Postgres database to deploy/backups/ (keeps the 7 most recent dumps).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
file="backups/solvai-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose -f docker-compose.prod.yml --env-file .env.prod exec -T db pg_dump -U solvai solvai | gzip > "$file"
ls -1t backups/*.sql.gz | tail -n +8 | xargs -r rm --
echo "Backup written to deploy/$file"
