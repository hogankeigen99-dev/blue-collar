import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseForm, parseValue, optionalText, optionalEmail, cuid } from "@/lib/validation";

describe("parseForm", () => {
  const schema = z.object({ name: z.string().min(1, "Name is required") });

  it("parses valid FormData", () => {
    const fd = new FormData();
    fd.set("name", "Alice");
    expect(parseForm(schema, fd)).toEqual({ name: "Alice" });
  });

  it("throws a readable error naming the field on failure", () => {
    const fd = new FormData();
    fd.set("name", "");
    expect(() => parseForm(schema, fd)).toThrow(/name: Name is required/);
  });
});

describe("parseValue", () => {
  it("passes through a valid value", () => {
    expect(parseValue(z.enum(["A", "B"]), "A")).toBe("A");
  });

  it("throws on an invalid value", () => {
    expect(() => parseValue(z.enum(["A", "B"]), "C")).toThrow();
  });
});

describe("optionalText", () => {
  const schema = optionalText(10);

  it("treats an empty string as undefined", () => {
    expect(schema.parse("")).toBeUndefined();
  });

  it("trims whitespace", () => {
    expect(schema.parse("  hi  ")).toBe("hi");
  });

  it("enforces the max length", () => {
    expect(() => schema.parse("this is way too long")).toThrow();
  });
});

describe("optionalEmail", () => {
  it("accepts an empty string as undefined", () => {
    expect(optionalEmail.parse("")).toBeUndefined();
  });

  it("lowercases and trims a valid email", () => {
    expect(optionalEmail.parse("  Alice@Example.com  ")).toBe("alice@example.com");
  });

  it("rejects an invalid email", () => {
    expect(() => optionalEmail.parse("not-an-email")).toThrow();
  });
});

describe("cuid", () => {
  it("rejects an empty id", () => {
    expect(() => cuid.parse("")).toThrow();
  });

  it("accepts a non-empty id", () => {
    expect(cuid.parse("cabc123")).toBe("cabc123");
  });
});
