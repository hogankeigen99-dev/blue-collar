import { describe, it, expect } from "vitest";
import {
  signUpSchema,
  logInSchema,
  createProjectSchema,
  addLineItemSchema,
  createScheduleEntrySchema,
  createCustomerSchema,
} from "@/lib/schemas";

describe("signUpSchema", () => {
  it("rejects a password shorter than 8 characters", () => {
    const result = signUpSchema.safeParse({
      orgName: "Acme",
      name: "Alice",
      email: "alice@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = signUpSchema.safeParse({
      orgName: "Acme",
      name: "Alice",
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid signup data", () => {
    const result = signUpSchema.safeParse({
      orgName: "Acme",
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });
});

describe("logInSchema", () => {
  it("rejects an empty password", () => {
    expect(logInSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("createProjectSchema", () => {
  it("treats empty optional fields as undefined", () => {
    const parsed = createProjectSchema.parse({
      title: "Fix panel",
      description: "",
      address: "",
      customerId: "",
      scheduledAt: "",
    });
    expect(parsed.description).toBeUndefined();
    expect(parsed.customerId).toBeUndefined();
    expect(parsed.scheduledAt).toBeUndefined();
  });

  it("parses a scheduledAt string into a Date", () => {
    const parsed = createProjectSchema.parse({
      title: "Fix panel",
      scheduledAt: "2026-01-01T10:00",
    });
    expect(parsed.scheduledAt).toBeInstanceOf(Date);
  });

  it("rejects a missing title", () => {
    expect(createProjectSchema.safeParse({ title: "" }).success).toBe(false);
  });
});

describe("addLineItemSchema", () => {
  it("coerces string quantity/unitPrice from form fields into numbers", () => {
    const parsed = addLineItemSchema.parse({
      description: "Widget",
      quantity: "3",
      unitPrice: "25.50",
    });
    expect(parsed.quantity).toBe(3);
    expect(parsed.unitPrice).toBe(25.5);
  });

  it("defaults quantity to 1 and unitPrice to 0 when omitted", () => {
    const parsed = addLineItemSchema.parse({ description: "Widget" });
    expect(parsed.quantity).toBe(1);
    expect(parsed.unitPrice).toBe(0);
  });

  it("rejects a negative or zero quantity", () => {
    expect(
      addLineItemSchema.safeParse({ description: "Widget", quantity: "0" }).success
    ).toBe(false);
    expect(
      addLineItemSchema.safeParse({ description: "Widget", quantity: "-1" }).success
    ).toBe(false);
  });

  it("rejects a negative unit price", () => {
    expect(
      addLineItemSchema.safeParse({ description: "Widget", unitPrice: "-5" }).success
    ).toBe(false);
  });
});

describe("createScheduleEntrySchema", () => {
  const base = { projectId: "cproj1", userId: "cuser1" };

  it("accepts an end time after the start time", () => {
    const result = createScheduleEntrySchema.safeParse({
      ...base,
      startAt: "2026-01-01T09:00",
      endAt: "2026-01-01T10:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an end time before the start time", () => {
    const result = createScheduleEntrySchema.safeParse({
      ...base,
      startAt: "2026-01-01T10:00",
      endAt: "2026-01-01T09:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an end time equal to the start time", () => {
    const result = createScheduleEntrySchema.safeParse({
      ...base,
      startAt: "2026-01-01T09:00",
      endAt: "2026-01-01T09:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("createCustomerSchema", () => {
  it("rejects an invalid email but allows omitting it", () => {
    expect(createCustomerSchema.safeParse({ name: "Acme", email: "bad" }).success).toBe(false);
    expect(createCustomerSchema.safeParse({ name: "Acme" }).success).toBe(true);
  });
});
