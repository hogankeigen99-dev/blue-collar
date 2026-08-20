import { test, expect } from "@playwright/test";
import { unique, field } from "./helpers";

test("sign up creates an organization and lands on the dashboard", async ({ page }) => {
  const id = unique();
  await page.goto("/signup");

  await field(page, "orgName").fill(`Acme ${id}`);
  await field(page, "name").fill("Test Owner");
  await field(page, "email").fill(`owner-${id}@example.com`);
  await field(page, "password").fill("password123");
  await page.getByRole("button", { name: "Create organization" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Test Owner")).toBeVisible();
});

test("sign up rejects a duplicate email", async ({ page }) => {
  const id = unique();
  const email = `dup-${id}@example.com`;

  await page.goto("/signup");
  await field(page, "orgName").fill(`First Org ${id}`);
  await field(page, "name").fill("First");
  await field(page, "email").fill(email);
  await field(page, "password").fill("password123");
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL("/");

  // logout to try signing up again with the same email
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/signup");
  await field(page, "orgName").fill(`Second Org ${id}`);
  await field(page, "name").fill("Second");
  await field(page, "email").fill(email);
  await field(page, "password").fill("password123");
  await page.getByRole("button", { name: "Create organization" }).click();

  await expect(page.getByText("An account with that email already exists")).toBeVisible();
});

test("login rejects a wrong password with a generic error", async ({ page }) => {
  const id = unique();
  const email = `login-${id}@example.com`;

  await page.goto("/signup");
  await field(page, "orgName").fill(`Login Org ${id}`);
  await field(page, "name").fill("Login Test");
  await field(page, "email").fill(email);
  await field(page, "password").fill("password123");
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL("/");
  await page.getByRole("button", { name: "Sign out" }).click();

  await page.goto("/login");
  await field(page, "email").fill(email);
  await field(page, "password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  // and the real credentials still work
  await field(page, "email").fill(email);
  await field(page, "password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
});

test("unauthenticated visitors are redirected to login", async ({ page }) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/login/);
});
