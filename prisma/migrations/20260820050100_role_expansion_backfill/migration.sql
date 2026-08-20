-- Existing MANAGER users become PROJECT_MANAGER — the closest match to
-- MANAGER's old permission tier (could create/manage projects). There's no
-- way to distinguish former MANAGER users who were actually doing sales
-- work from those doing PM work from the data alone; an org admin can
-- reassign individual users to SALES afterward via the Users page.
UPDATE "User" SET role = 'PROJECT_MANAGER' WHERE role = 'MANAGER';

-- Postgres has no ALTER TYPE ... DROP VALUE, so the now-unused 'MANAGER'
-- label stays on the Role type at the database level — harmless, and no
-- longer referenced anywhere in prisma/schema.prisma or application code.
