# SolvAI Quickstart

Get the SolvAI system running locally in 3 minutes.

## Prerequisites
- Node.js (v18+)
- Python (3.10+)
- PostgreSQL (if running Supabase locally)

## 1. Environment Setup

Copy the example environment variables:
```bash
cp .env.example .env
```
Ensure you set your `GEMINI_API_KEY` and `STRIPE_SECRET_KEY` inside `.env`.

## 2. Start Frontend

The frontend uses Vite and runs on port 5173.

```bash
cd frontend
npm install
npm run dev
```

## 3. Start Express Backend (Stripe Webhooks)

The Express server handles Stripe checkout flows and runs on port 4242.

```bash
cd server
npm install
node index.js
```

## 4. Start Python Backend (Gemini API / Supabase)

The FastAPI server drives the AI processing and connects to Supabase.

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 5. Verify Setup

1. Open your browser to [http://localhost:5173](http://localhost:5173).
2. The frontend uses `mockApi.js` by default for simulated data.
3. To fully test end-to-end (e.g. Stripe checkout), ensure your `.env` keys match your local Stripe CLI and Gemini API configurations.
