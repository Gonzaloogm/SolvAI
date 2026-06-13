# SolvAI

**Self-Serve Explainable Credit AI for EU/UK Freelancers & Microbusinesses**

SolvAI brings the same explainable credit AI that today is only accessible to large banks (via enterprise vendors) directly to individual freelancers and microbusinesses in the Stripe ecosystem—as a self-serve report they can request for themselves, not something locked inside a bank's underwriting department.

---

## Architecture

```
solvai/
├── backend/          # FastAPI + SQLAlchemy + Celery + Gemini
├── frontend/         # Vite + React 18
├── docker-compose.yml
└── .env.example
```

### Backend Stack
| Layer | Technology |
|-------|-----------|
| Runtime | Python 3.11 |
| API Framework | FastAPI 0.111 |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic 1.13 |
| Database | PostgreSQL 16 |
| Cache/Broker | Redis 7.2 |
| Task Queue | Celery 5.3 |
| AI/ML | Google Gemini Pro |
| Auth | JWT (python-jose + passlib) |
| Email | Resend |
| Storage | AWS S3 |
| Logging | Loguru |

### Frontend Stack
| Layer | Technology |
|-------|-----------|
| Framework | Vite 5 + React 18 |
| Routing | React Router 6 |
| HTTP | Axios |
| Styling | Vanilla CSS (design tokens) |
| Fonts | Geist Sans + JetBrains Mono |

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+

### 1. Clone and configure environment
```bash
git clone <repo>
cd solvai
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Start with Docker Compose
```bash
docker compose up -d
```

Services:
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Flower** (Celery UI): http://localhost:5555

### 3. Run database migrations
```bash
docker compose exec api alembic upgrade head
```

### 4. Start the frontend (development)
```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

---

## Local Development (without Docker)

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start PostgreSQL and Redis locally, then:
uvicorn app.main:app --reload --port 8000

# In a separate terminal, start Celery worker:
celery -A app.celery_app worker --loglevel=info
```

### Database Migrations
```bash
cd backend
alembic upgrade head          # Apply all migrations
alembic downgrade -1          # Rollback one migration
alembic revision --autogenerate -m "description"  # Generate new migration
```

---

## API Documentation

FastAPI auto-generates interactive API docs:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register user + organization |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/users/me` | Current user profile |
| GET | `/data-sources` | List connected data sources |
| POST | `/data-sources/connect/{type}` | Connect a data source |
| POST | `/solvency-reports` | Trigger report generation |
| GET | `/solvency-reports/{id}` | Get report (poll for status) |
| GET | `/lender-matching/{report_id}` | Get lender matches |

---

## Database Schema

Four tables: `organizations` → `users` → `financial_data_sources`, `solvency_reports`

All tables use:
- UUID v4 primary keys
- Soft delete (`is_deleted` + `deleted_at`)
- Timestamps (`created_at`, `updated_at`)

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

**Critical for MVP:**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Random secret for JWT signing
- `GEMINI_API_KEY` — Google AI Studio API key
- `REDIS_URL` — Redis connection string

**Optional for MVP (stubs in place):**
- `STRIPE_SECRET_KEY` — Stripe data ingestion
- `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET` — Xero integration
- `RESEND_API_KEY` — Email notifications
- AWS credentials — S3 document storage

---

## Project Status

MVP — Core features implemented:
- [x] User registration & JWT authentication
- [x] Organization management
- [x] Financial data source connections (Stripe, Xero, PayPal, Manual)
- [x] AI solvency report generation via Gemini Pro (async Celery task)
- [x] Lender matching (stub matches based on solvency score)
- [x] React frontend with 5 screens (Login, Register, Dashboard, Report Detail, Data Sources)
- [x] Docker Compose local dev environment
- [x] GitHub Actions CI

---

## License
Proprietary — SprintFounders / SolvAI 2026
