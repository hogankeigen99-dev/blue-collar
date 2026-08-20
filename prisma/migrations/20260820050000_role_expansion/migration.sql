-- Expand the Role enum from OWNER/ADMIN/MANAGER/TECHNICIAN to
-- OWNER/ADMIN/EXECUTIVE/SALES/PROJECT_MANAGER/FIELD_TECH.
--
-- TECHNICIAN is renamed in place (existing rows keep their identity, no
-- data rewrite needed — Postgres enum labels are metadata). The three
-- genuinely new values are added here but MUST NOT be referenced by any
-- statement in this same transaction (Postgres forbids using a new enum
-- label before the transaction that added it commits) — the backfill that
-- moves existing MANAGER rows to PROJECT_MANAGER lives in the next
-- migration for exactly that reason.
ALTER TYPE "Role" RENAME VALUE 'TECHNICIAN' TO 'FIELD_TECH';
ALTER TYPE "Role" ADD VALUE 'EXECUTIVE';
ALTER TYPE "Role" ADD VALUE 'SALES';
ALTER TYPE "Role" ADD VALUE 'PROJECT_MANAGER';
