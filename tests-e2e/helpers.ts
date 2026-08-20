import type { Page } from "@playwright/test";

/** Unique-enough suffix so repeated local runs against the same DB don't collide. */
export function unique(): string {
  return `${Date.now()}${Math.floor(Math.random() * 10000)}`;
}

/**
 * Form labels in this app aren't wired to their inputs via htmlFor/id, so
 * getByLabel doesn't resolve them. Every field has a stable `name` attribute
 * matching its server action's form field — use that instead.
 */
export function field(page: Page, name: string) {
  return page.locator(`:is(input, select, textarea)[name="${name}"]`);
}
