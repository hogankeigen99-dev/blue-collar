import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

/**
 * Roles no longer form a single ladder — Sales and Project Manager are
 * peers with different jobs, not one above the other, and Executive has
 * broad visibility without operational write access. Permissions are
 * expressed as capabilities each role does or doesn't have, rather than a
 * "high enough rank" check.
 */
export type Capability =
  | "manage_users" // invite/deactivate users, assign roles
  | "view_org_activity" // org-wide activity feed
  | "manage_projects" // create/delete projects, manage project team membership
  | "manage_pipeline"; // create/update leads and estimates, convert to a project

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  OWNER: ["manage_users", "view_org_activity", "manage_projects", "manage_pipeline"],
  ADMIN: ["manage_users", "view_org_activity", "manage_projects", "manage_pipeline"],
  EXECUTIVE: ["view_org_activity"],
  SALES: ["manage_pipeline"],
  PROJECT_MANAGER: ["manage_projects", "manage_pipeline"],
  FIELD_TECH: [],
};

export function hasCapability(role: Role, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export const ALL_ROLES: Role[] = ["OWNER", "ADMIN", "EXECUTIVE", "SALES", "PROJECT_MANAGER", "FIELD_TECH"];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  EXECUTIVE: "Executive",
  SALES: "Sales",
  PROJECT_MANAGER: "Project Manager",
  FIELD_TECH: "Field Tech",
};

/**
 * Roles an actor may grant when inviting a user. Only OWNER/ADMIN can
 * invite at all (gated separately by the manage_users capability); OWNER
 * can grant any role including another OWNER, ADMIN can grant any role
 * except OWNER (can't mint another account owner).
 */
export function assignableRoles(actorRole: Role): Role[] {
  return actorRole === "OWNER" ? ALL_ROLES : ALL_ROLES.filter((r) => r !== "OWNER");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
