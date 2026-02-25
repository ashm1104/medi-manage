# Deploy Secure Health Hub on Render (Free) + Supabase

This project is designed to run as a single Node service that serves both API and frontend.

## 1) Prerequisites

- A GitHub repo containing this project
- A Render account
- A Supabase project

## 2) Use the Supabase Pooler URL (important)

Use the Supabase **pooler** connection string for `DATABASE_URL` in Render.

- In Supabase: `Project Settings` -> `Database` -> `Connect`
- Copy a **pooler** URL (usually port `6543`)
- Keep `sslmode=require` if Supabase includes it

Example format:

```text
postgresql://postgres.YOUR_PROJECT_REF:YOUR_DB_PASSWORD@aws-0-YOUR-REGION.pooler.supabase.com:6543/postgres?sslmode=require
```

## 3) Create the Render web service

You can deploy with either method:

- Blueprint: Render detects `render.yaml`
- Manual service setup in UI

Use these commands:

- Build command: `npm ci && npm run build`
- Start command: `npm run start`

This app reads `PORT` from Render automatically.

## 4) Set Render environment variables

Set these in Render service -> `Environment`:

- `DATABASE_URL` = your Supabase pooler URL
- `VITE_SUPABASE_URL` = `https://<your-project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = your anon key

## 5) Push database schema once

From your local machine:

```powershell
$env:DATABASE_URL="YOUR_SUPABASE_POOLER_URL"
npm run db:push
```

## 6) Verify deployment

- Open the Render URL
- Confirm UI loads
- Log in and load data screens (for example facilities/patients)
- Check Render logs for DB connection success and no timeout errors

## 7) Expected free-tier behavior

- Service may sleep after inactivity (cold start on first request)
- PDFs under `server/generated_pdfs/` are local filesystem artifacts and may disappear after restart/redeploy

## 8) Troubleshooting

- `ETIMEDOUT ...:5432`:
  - Usually direct Supabase DB host over IPv6
  - Switch `DATABASE_URL` to pooler URL on port `6543`
- `DATABASE_URL must be set`:
  - Add it in Render env vars
- Frontend loads but auth/data fails:
  - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Render
