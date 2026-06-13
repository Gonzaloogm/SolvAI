# SolvAI — Execution & Testing Guide

This guide provides step-by-step instructions on how to start, execute, and test the SolvAI platform locally.

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Docker & Docker Compose** (for PostgreSQL, Redis, and backend services)
- **Node.js 20+** (for running the Vite frontend)
- **Python 3.11+** (optional, if you want to run the backend outside of Docker)

---

## 2. Environment Setup

The application requires environment variables to connect services and external APIs.

1. Navigate to the project root:
   ```bash
   cd /Users/alumnoad/SolvAI/SolvAI
   ```
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in any required missing values. For local testing, the defaults for `DATABASE_URL` and `REDIS_URL` are already correctly configured for Docker Compose.
   - **Crucial:** Add your `GEMINI_API_KEY` to test the AI report generation. If left empty, the application will gracefully fall back to generating mock reports.

---

## 3. Starting the Backend Infrastructure

We will use Docker Compose to spin up the database, cache, API server, and background workers.

1. Start all Docker services in detached mode:
   ```bash
   docker compose up -d
   ```
2. Verify that the services are running:
   ```bash
   docker compose ps
   ```
   You should see `solvai_api`, `solvai_db`, `solvai_redis`, `solvai_worker`, and `solvai_flower` all in a running state.

3. **Initialize the Database:** Apply the Alembic migrations to create the database tables.
   ```bash
   docker compose exec api alembic upgrade head
   ```

---

## 4. Starting the Frontend App

The frontend is a React application built with Vite. It runs locally and proxies API requests to the Docker backend.

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd /Users/alumnoad/SolvAI/SolvAI/frontend
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to **http://localhost:5173**

---

## 5. End-to-End Manual Testing Flow

To test the core functionality of the MVP, follow this path through the application:

1. **Registration:**
   - Go to `http://localhost:5173/register`
   - Create a new account with an email, password, and organization name.
2. **Connect Data Sources:**
   - From the Dashboard, navigate to **Data Sources**.
   - Click "Connect New Source" and select "Manual Upload" or one of the API integrations (they are mocked for the MVP).
   - Verify the source appears in your connected list as `CONNECTED`.
3. **Generate Solvency Report:**
   - Go back to the **Dashboard** and click **Generate New Report**.
   - The status should briefly show `PENDING`, then `GENERATING`.
   - Behind the scenes, the Celery worker (`solvai_worker`) will process the request. If you provided a Gemini API key, it will contact Google; otherwise, it will generate a realistic mock report.
   - The frontend will automatically poll the API until the status changes to `COMPLETED`.
4. **View Report & Lender Matches:**
   - Click to view the generated report.
   - Review the AI narrative, the Solvency Score gauge, and the key metrics.
   - Scroll to the bottom to see matched lenders tailored to the generated solvency score.

---

## 6. Running Automated Tests

### Backend Tests
The backend uses `pytest`. You can run the test suite directly inside the API container:
```bash
docker compose exec api pytest
```

### Frontend Build Test
To verify the frontend builds successfully for production without any errors:
```bash
cd /Users/alumnoad/SolvAI/SolvAI/frontend
npm run build
```

---

## 7. Monitoring & Debugging

- **API Documentation (Swagger UI):** Available at http://localhost:8000/docs
- **Celery Task Monitor (Flower):** Available at http://localhost:5555. Use this to monitor background report generation tasks.
- **Viewing Backend Logs:**
  ```bash
  # API server logs
  docker compose logs -f api

  # Background worker logs (useful for debugging Gemini report generation)
  docker compose logs -f worker
  ```
- **Stopping Services:**
  ```bash
  docker compose down
  ```
