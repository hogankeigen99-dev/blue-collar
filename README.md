# Blue Collar — Crew & Job Manager

A minimal MVP for a trades business to track jobs, crew, and customers: who's
assigned to what, where it is, and its status (scheduled / in progress /
completed / cancelled).

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- Tailwind CSS

## Features (MVP scope)

- **Jobs**: create, view, list, update status, assign one or more workers, delete
- **Workers**: add crew members with role/contact info
- **Customers**: add customer records with address/contact info
- **Dashboard**: job counts by status, upcoming/recent jobs

Not in scope for this MVP: authentication, invoicing/payments, scheduling
calendar, notifications. These are natural next steps once the core data
model is validated.

## Local development

Requires Node 20+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env   # set DATABASE_URL to your local Postgres
npm run db:migrate     # applies migrations, creates the schema
npm run db:seed        # optional: adds sample workers/customers/jobs
npm run dev
```

App runs at http://localhost:3000.

## Deploying

### Railway

1. Create a new Railway project from this GitHub repo.
2. Add a **PostgreSQL** plugin to the project — Railway sets `DATABASE_URL`
   automatically for services in the same project (reference it as
   `${{Postgres.DATABASE_URL}}` on the app service if not linked automatically).
3. Railway auto-detects the build/start commands from `railway.json`:
   - Build: `npm run build` (runs `prisma generate` then `next build`)
   - Deploy: `npm run db:deploy && npm start` (applies pending migrations, then starts the server)
4. Deploy. On each push to the connected branch, Railway rebuilds and runs
   migrations automatically before starting the app.

### GitHub

- Push/PR to `main` triggers `.github/workflows/ci.yml`, which spins up a
  throwaway Postgres service, applies migrations, lints, and builds — a
  merge gate before Railway deploys.

## Project structure

```
app/                  Next.js App Router pages (dashboard, jobs, workers, customers)
lib/prisma.ts         Shared Prisma client
lib/actions.ts        Server Actions (create/update/delete for jobs/workers/customers)
prisma/schema.prisma  Data model
prisma/seed.ts        Sample data
railway.json          Railway build/deploy config
.github/workflows/    CI
```
