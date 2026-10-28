# Deploying the demo on a single VM

The demo runs on one virtual machine with Docker Compose (`deploy/docker-compose.prod.yml`):

```
Internet ──443──▶ Caddy ──┬── /api/*  ──▶ api (FastAPI, 2 workers) ──┐
  (HTTPS, auto TLS)       └── /*      ──▶ React build (static)        ├── db (Postgres 16 + pgvector)
                                              worker (Celery) ────────┴── redis (broker + live telemetry)
```

- Caddy obtains and renews the Let's Encrypt certificate by itself.
- Migrations run automatically (`migrate` service) before the API starts.
- Postgres data and TLS certificates live in Docker volumes and survive restarts.
- Idle memory is about 650 MB; report generation needs headroom. Use a VM with **at least 2 GB RAM** (4 GB or more is comfortable).

The Cloud Run pipeline (`cloudbuild.yaml`, [deployment.md](deployment.md)) remains the scalable production path. This setup is the cheapest way to keep a demo online.

## 1. Create the VM

Any provider works. Use Ubuntu 22.04 or 24.04, x86-64 or ARM64, at least 2 GB of RAM and a public IPv4 address.

**Oracle Cloud Always Free** (€0, needs a card for verification):

1. Compute → Instances → **Create instance**.
2. Image: *Canonical Ubuntu 24.04*. Shape: *Ampere VM.Standard.A1.Flex*, 2 OCPU and 12 GB (within the Always Free allowance). If it reports "out of capacity", retry later or pick another availability domain.
3. Add your SSH public key and create the instance. Note its **public IP**.
4. Open ports 80 and 443. In the instance's subnet, open the **Security List** and add two *Ingress Rules*: source `0.0.0.0/0`, TCP, destination ports `80` and `443`.
5. Oracle's Ubuntu images also block these ports in the VM's own firewall. After logging in (step 2):
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

On other providers, allow inbound TCP 80 and 443 in their firewall or security group.

## 2. Install Docker

```bash
ssh ubuntu@<VM_IP>
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && exit      # log out and back in to use docker without sudo
```

## 3. Pick a hostname

Let's Encrypt needs a hostname, not a bare IP. Without a domain, use **sslip.io**, which maps a name to the IP inside it:

```
VM IP 203.0.113.7   →   DOMAIN=203-0-113-7.sslip.io
```

With your own domain, create an `A` record pointing to the VM IP and use that name instead.

## 4. Configure

```bash
git clone https://github.com/Gonzaloogm/SolvAI.git && cd SolvAI
cp deploy/.env.prod.example deploy/.env.prod
nano deploy/.env.prod
```

Fill in at least `DOMAIN`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_KEY` and `GEMINI_API_KEY`; the file explains how to generate each secret. For PayPal billing, also set the `PAYPAL_BILLING_*`, `PAYPAL_*_PLAN_ID` and `PAYPAL_WEBHOOK_ID` values. To offer judges the **Try with demo data** button, set `DEMO_STRIPE_TEST_KEY`, `DEMO_PAYPAL_CLIENT_ID` and `DEMO_PAYPAL_SECRET` (the values from `.env.demo`). `deploy/.env.prod` is git-ignored: keep it only on the VM.

## 5. Deploy

```bash
./deploy/deploy.sh
```

This builds the images, applies migrations, starts everything and waits until `https://$DOMAIN/api/health` answers. The first build takes a few minutes. Then open `https://$DOMAIN`.

To update to the latest `main`, run the same command again: it pulls and rebuilds.

## 6. After the first deploy

- **PayPal webhook:** in the SolvAI Billing app (developer.paypal.com → Apps & Credentials → app → Webhooks), add `https://$DOMAIN/api/webhooks/paypal-billing` with the `BILLING.SUBSCRIPTION.*` events. Put its ID in `PAYPAL_WEBHOOK_ID` and redeploy. Payment return URLs need no setup: they come from `DOMAIN`.
- **Stripe webhook** (if Stripe billing is used): `https://$DOMAIN/api/billing/webhook`.
- **Demo account for judges:** registers the account through the API, connects the Stripe demo account and the PayPal sandbox, sets it to Pro and generates a first report:
  ```bash
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod exec \
    -e DEMO_EMAIL=demo@yourdomain -e DEMO_PASSWORD='choose-one' \
    -e STRIPE_DEMO_TEST_KEY=sk_test_... -e PAYPAL_SANDBOX_CLIENT_ID=... -e PAYPAL_SANDBOX_SECRET=... \
    api python scripts/create_demo_account.py
  ```
  It is safe to run again later to refresh the data.
- **Promo code for judges:** gives Pro (full report and PDF) to whoever signs up with it, or redeems it later under **Account**. Codes are case-insensitive; re-running updates the limit and expiry. Share it only in Devpost's testing instructions, not in the repository:
  ```bash
  docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod exec \
    api python scripts/create_promo_code.py <CODE> --plan pro --max-uses 300 --expires 2026-12-31
  ```

## Operating it

```bash
cd ~/SolvAI/deploy
docker compose -f docker-compose.prod.yml --env-file .env.prod ps            # status
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api worker
./backup.sh                                                                  # pg_dump into deploy/backups/ (keeps 7)
```

API docs are served at `https://$DOMAIN/api/docs`.

**Troubleshooting:**
- **Certificate errors on the first start:** check that ports 80 and 443 are open (both firewalls on Oracle) and that `DOMAIN` resolves to the VM IP. Then run `docker compose ... logs caddy`.
- **502 from Caddy for a few seconds after a deploy:** the API is still starting; it clears once its health check passes.
