import { describe, it, expect } from "vitest";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/rate-limit";

describe("rate limiting", () => {
  it("allows an unknown key", () => {
    expect(checkRateLimit("unknown-key")).toBe(true);
  });

  it("blocks after 5 failed attempts", () => {
    const key = "test-lockout";
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key)).toBe(true);
      recordFailedAttempt(key);
    }
    expect(checkRateLimit(key)).toBe(false);
  });

  it("clearRateLimit resets the counter", () => {
    const key = "test-clear";
    for (let i = 0; i < 5; i++) recordFailedAttempt(key);
    expect(checkRateLimit(key)).toBe(false);
    clearRateLimit(key);
    expect(checkRateLimit(key)).toBe(true);
  });

  it("tracks separate keys independently", () => {
    recordFailedAttempt("user-a@example.com");
    expect(checkRateLimit("user-a@example.com")).toBe(true);
    expect(checkRateLimit("user-b@example.com")).toBe(true);
  });
});
