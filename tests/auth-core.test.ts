import { describe, it, expect } from "vitest";
import { roleAtLeast, hashPassword, verifyPassword, ROLE_ORDER } from "@/lib/auth-core";

describe("roleAtLeast", () => {
  it("orders roles TECHNICIAN < MANAGER < ADMIN < OWNER", () => {
    expect(ROLE_ORDER).toEqual(["TECHNICIAN", "MANAGER", "ADMIN", "OWNER"]);
  });

  it("allows a role to act on its own minimum", () => {
    expect(roleAtLeast("MANAGER", "MANAGER")).toBe(true);
  });

  it("allows a higher role to act on a lower minimum", () => {
    expect(roleAtLeast("OWNER", "TECHNICIAN")).toBe(true);
    expect(roleAtLeast("ADMIN", "MANAGER")).toBe(true);
  });

  it("denies a lower role acting on a higher minimum", () => {
    expect(roleAtLeast("TECHNICIAN", "MANAGER")).toBe(false);
    expect(roleAtLeast("MANAGER", "ADMIN")).toBe(false);
    expect(roleAtLeast("ADMIN", "OWNER")).toBe(false);
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
