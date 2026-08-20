# Blue Collar — Field Service Platform

A multi-tenant platform for trades businesses to run leads, estimates,
projects, crews, and scheduling in one place.

New screens and significant feature work go through a spec first — see
[`docs/PRODUCT_PROCESS.md`](docs/PRODUCT_PROCESS.md) (Figma → PRD → Issue →
Code → QA) and the "Feature (with PRD)" issue template.

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
- **Users & roles**: `OWNER`, `ADMIN`, `EXECUTIVE`, `SALES`, `PROJECT_MANAGER`,
  `FIELD_TECH` — a capability-based permission model (`lib/auth-core.ts`)
  rather than a single hierarchy, since Sales and PM are peers with
  different jobs, not one above the other. `OWNER`/`ADMIN` invite users by
  email; invitees set their own password via a signed, expiring link.
  Self-service "forgot password" too
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

## Security & validation

- Every Server Action validates its input with [zod](https://zod.dev)
  (`lib/schemas.ts`) — no ad-hoc string parsing.
- Login is rate-limited (5 failed attempts / 15 min, per email) — see
  `lib/rate-limit.ts`. In-memory, per-process; swap for a shared store before
  running multiple replicas.
- File uploads are size-capped (10MB) and restricted to an explicit
  MIME/extension allowlist (`lib/actions/attachments.ts`) — no SVG/HTML/JS,
  to avoid stored-XSS via re-served uploads.
- Every query is scoped by `organizationId` (and, for nested resources, by
  their parent's org) to prevent cross-tenant access.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) are set in `next.config.mjs`.
- `lib/env.ts` fails fast on boot if `DATABASE_URL` is missing, instead of
  surfacing an opaque Prisma error later.

## Email

Invite and password-reset emails go through [Resend](https://resend.com)
(`lib/email.ts`, a direct HTTP API call — no SDK dependency) if
`RESEND_API_KEY` is set. Without it, the app still functions:

- **Inviting a user**: `/users/new` shows the invite link on-screen after
  creation so the admin can share it manually.
- **Password reset**: the link is never shown in the response (that would
  let anyone reset anyone's password) — it's logged server-side instead, for
  an operator to retrieve.

Tokens (`AuthToken` model) are single-use and expire — 7 days for invites,
1 hour for password resets — and both flows land on the same `/set-password`
page.

## Testing

```bash
npm run test       # Vitest — auth/role logic, validation schemas, rate limiter
npm run test:e2e   # Playwright — real HTTP/Server Action flows against a running app
```
Vitest covers the pure logic (role hierarchy, password hashing, zod schemas,
rate limiting) directly. Playwright drives a real browser against a built,
running instance (`tests-e2e/`) — signup/login, project + task creation,
lead → estimate → approve → convert-to-project, and the invite/set-password
flow — each against a real Postgres database. `test:e2e` requires
`DATABASE_URL` to point at a reachable Postgres instance; it builds and
starts the app itself (see `playwright.config.ts`). `.github/workflows/ci.yml`
runs both suites, plus lint and build, on every push/PR.

### Known limitations / next steps

- Email (invites, password reset) requires `RESEND_API_KEY` to actually
  deliver — see the "Email" section below for the fallback behavior without
  it.
- No drag-and-drop calendar or Kanban reordering — schedule and task lists are
  plain, sorted lists.
- Railway's "Wait for CI" deployment gate needs the
  [Railway GitHub App](https://github.com/apps/railway) installed on the repo
  (a one-time action only the repo owner can grant); until then, Railway
  deploys every push to `main` immediately rather than waiting on CI.

## Local development

Requires Node 20+, a PostgreSQL database, and a Cloudflare R2 bucket (photo/
document uploads fail without one — see `.env.example`).

```bash
npm install
cp .env.example .env   # set DATABASE_URL and the R2_* vars
npm run db:migrate     # applies migrations, creates the schema
npm run db:seed        # optional: seeds a small org, users, and sample data
npm run dev
```

App runs at http://localhost:3000. After seeding, sign in at `/login` with
`owner@riverside.test` / `password123`, or start fresh at `/signup`.

### Demo company (for sales demos)

`npm run db:seed:demo` seeds a second, much larger organization —
**Sterling Build & Renovate** — designed to make the dashboard look like a
real, busy contractor rather than an empty account: 30 employees (1 owner, 1
admin, 5 PMs, 8 sales reps, 15 field crew — all sharing the password
`password123`), 40 customers, 18 leads with estimates in various pipeline
stages, and 25 projects spanning every status (scheduled, in progress,
on hold, completed, cancelled) with tasks, some deliberately overdue, and a
populated schedule and activity feed. A handful of "won" leads are wired all
the way through `Lead → Estimate (approved) → Project`, matching the
platform's core pipeline. It coexists with the regular `db:seed` fixture (a
separate organization) and refuses to run twice against the same database.

Photo/document attachments are only seeded if `R2_*` env vars are set at
seed time (skipped otherwise) — the Files tab calls R2 for every attachment
on render with no fallback, so seeding fake storage keys without a real
bucket would make that tab error out instead of just showing broken images.

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
prisma/seed-demo.ts           Large "Sterling Build & Renovate" demo org for sales demos
proxy.ts                     Route protection (redirects unauthenticated requests to /login)
railway.json                  Railway build/deploy config
.github/workflows/            CI
```
