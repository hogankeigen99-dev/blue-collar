# Blue Collar — Field Service Platform

A multi-tenant platform for trades businesses to run leads, estimates,
projects, crews, and scheduling in one place.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- Tailwind CSS
- Custom email/password auth (bcrypt password hashing, DB-backed sessions via
  an HTTP-only cookie) — no third-party auth provider

## Features

- **Organizations**: every account belongs to an organization (tenant); all
  data is scoped to it
- **Auth**: sign up creates an organization + its first `OWNER` user; sign in
  / sign out
- **Users & roles**: `OWNER > ADMIN > MANAGER > TECHNICIAN` hierarchy. Admins+
  add users and set an initial password (no email invite flow yet)
- **Projects**: a command center per project — Overview, Tasks, Team,
  Schedule, Files, and Activity tabs
- **Tasks**: per-project to-dos with an assignee, due date, and status
- **Team assignments**: assign org users to a project as `LEAD` or `MEMBER`
- **Activity log**: every key action (status changes, assignments, uploads,
  conversions, ...) is recorded per-project and in an org-wide feed
  (`/activity`, admin+)
- **Photos & documents**: upload files to a project; stored in a private
  Cloudflare R2 bucket, served via short-lived signed URLs (`lib/storage.ts`)
- **Scheduling**: assign technicians to projects for a time window, viewable
  org-wide (`/schedule`) or per-project
- **Field view** (`/field`): a technician's simplified view of today's
  schedule and their open tasks, with one-tap status updates
- **Leads**: a simple pipeline (`NEW → CONTACTED → QUALIFIED → WON/LOST`)
- **Estimates**: line items, status flow (`DRAFT → SENT → APPROVED/REJECTED`),
  and a one-click **convert to project** once approved

### Known limitations / next steps

- No email delivery: new users get a password set directly by an admin, and
  there's no password-reset flow yet.
- No drag-and-drop calendar or Kanban reordering — schedule and task lists are
  plain, sorted lists.

## Local development

Requires Node 20+, a PostgreSQL database, and a Cloudflare R2 bucket (photo/
document uploads fail without one — see `.env.example`).

```bash
npm install
cp .env.example .env   # set DATABASE_URL and the R2_* vars
npm run db:migrate     # applies migrations, creates the schema
npm run db:seed        # optional: seeds an org, users, and sample data
npm run dev
```

App runs at http://localhost:3000. After seeding, sign in at `/login` with
`owner@riverside.test` / `password123`, or start fresh at `/signup`.

## Deploying

### Railway

1. Create a new Railway project from this GitHub repo.
2. Add a **PostgreSQL** plugin to the project — Railway sets `DATABASE_URL`
   automatically for services in the same project (reference it as
   `${{Postgres.DATABASE_URL}}` on the app service if not linked automatically).
2b. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and
   `R2_BUCKET_NAME` on the app service (see `.env.example`) — required for
   photo/document uploads.
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
app/                        Next.js App Router pages
  projects/[id]/             Project command center (tasks, team, schedule, files, activity tabs)
  leads/, estimates/         Lead pipeline and estimate → project conversion
  users/, activity/          Admin-only user management and org-wide activity feed
  field/                     Technician field view
lib/prisma.ts                Shared Prisma client
lib/auth.ts                  Sessions, password hashing, role checks
lib/storage.ts                Cloudflare R2 (S3-compatible) upload/delete/signed-URL client
lib/activity.ts              Activity log helper
lib/actions/                 Server Actions, one file per domain
prisma/schema.prisma         Data model
prisma/seed.ts                Sample org, users, project, lead, and estimate
proxy.ts                     Route protection (redirects unauthenticated requests to /login)
railway.json                  Railway build/deploy config
.github/workflows/            CI
```
