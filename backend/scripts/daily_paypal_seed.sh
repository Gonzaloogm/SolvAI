#!/bin/bash
# Daily PayPal sandbox payments for the demo (2-4 per day, so history looks natural).
# Scheduled with launchd on the developer's Mac: see docs/demo.md
set -euo pipefail
cd "$(dirname "$0")/.."            # backend/
set -a; . ../.env.demo; set +a
count=$(( RANDOM % 3 + 2 ))
echo "=== $(date '+%Y-%m-%d %H:%M:%S') — creating $count payment(s)"
.venv/bin/python -W ignore scripts/seed_paypal_sandbox.py --count "$count"
