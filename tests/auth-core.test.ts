import { describe, it, expect } from "vitest";
import { hasCapability, assignableRoles, ALL_ROLES, hashPassword, verifyPassword } from "@/lib/auth-core";

describe("hasCapability", () => {
  it("gives OWNER and ADMIN every capability", () => {
    for (const capability of ["manage_users", "view_org_activity", "manage_projects", "manage_pipeline"] as const) {
      expect(hasCapability("OWNER", capability)).toBe(true);
      expect(hasCapability("ADMIN", capability)).toBe(true);
    }
  });

  it("gives EXECUTIVE visibility but no write capabilities", () => {
    expect(hasCapability("EXECUTIVE", "view_org_activity")).toBe(true);
    expect(hasCapability("EXECUTIVE", "manage_users")).toBe(false);
    expect(hasCapability("EXECUTIVE", "manage_projects")).toBe(false);
    expect(hasCapability("EXECUTIVE", "manage_pipeline")).toBe(false);
  });

  it("gives SALES the pipeline but not project management", () => {
    expect(hasCapability("SALES", "manage_pipeline")).toBe(true);
    expect(hasCapability("SALES", "manage_projects")).toBe(false);
    expect(hasCapability("SALES", "manage_users")).toBe(false);
  });

  it("gives PROJECT_MANAGER both projects and the pipeline", () => {
    expect(hasCapability("PROJECT_MANAGER", "manage_projects")).toBe(true);
    expect(hasCapability("PROJECT_MANAGER", "manage_pipeline")).toBe(true);
    expect(hasCapability("PROJECT_MANAGER", "manage_users")).toBe(false);
  });

  it("gives FIELD_TECH no elevated capabilities", () => {
    for (const capability of ["manage_users", "view_org_activity", "manage_projects", "manage_pipeline"] as const) {
      expect(hasCapability("FIELD_TECH", capability)).toBe(false);
    }
  });
});

describe("assignableRoles", () => {
  it("lets OWNER grant every role, including OWNER", () => {
    expect(assignableRoles("OWNER")).toEqual(ALL_ROLES);
    expect(assignableRoles("OWNER")).toContain("OWNER");
  });

  it("lets ADMIN grant every role except OWNER", () => {
    const roles = assignableRoles("ADMIN");
    expect(roles).not.toContain("OWNER");
    expect(roles).toEqual(ALL_ROLES.filter((r) => r !== "OWNER"));
  });
});

describe("password hashing", () => {
  it("round-trips a correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("never stores the password in plaintext", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).not.toContain("hunter2");
  });
});
