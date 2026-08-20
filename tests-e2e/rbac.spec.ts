import { test, expect, type Page } from "@playwright/test";
import { unique, field } from "./helpers";

async function inviteAndSetPassword(page: Page, name: string, email: string, role: string, password: string) {
  await page.goto("/users/new");
  await field(page, "name").fill(name);
  await field(page, "email").fill(email);
  await field(page, "role").selectOption(role);
  await page.getByRole("button", { name: "Invite user" }).click();

  const linkText = await page.locator("code").innerText();
  const match = linkText.match(/\/set-password\?token=\S+/);
  expect(match).toBeTruthy();
  const setPasswordPath = match![0];

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto(setPasswordPath);
  await field(page, "password").fill(password);
  await field(page, "confirmPassword").fill(password);
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page).toHaveURL("/");
}

async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await field(page, "email").fill(email);
  await field(page, "password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

test("server-side capability checks block a Field Tech from project/user/activity management, independent of nav visibility", async ({ page }) => {
  const id = unique();
  const ownerEmail = `owner-rbac-${id}@example.com`;
  const fieldEmail = `field-rbac-${id}@example.com`;
  const password = "password123";

  await page.goto("/signup");
  await field(page, "orgName").fill(`RBAC Org ${id}`);
  await field(page, "name").fill("RBAC Owner");
  await field(page, "email").fill(ownerEmail);
  await field(page, "password").fill(password);
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL("/");

  await inviteAndSetPassword(page, "Field Tech Persona", fieldEmail, "FIELD_TECH", password);

  // nav-level: a Field Tech shouldn't see links to pages they can't use
  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Activity" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "My Field View" })).toBeVisible();

  // server-level: navigating straight to the URL must still block them —
  // this is the part client-side nav hiding alone could never guarantee
  await page.goto("/projects/new");
  await expect(page.getByRole("button", { name: "Create project" })).toHaveCount(0);

  await page.goto("/users/new");
  await expect(page.getByRole("heading", { name: "Invite user" })).toHaveCount(0);

  await page.goto("/activity");
  await expect(page.getByRole("heading", { name: "Activity" })).toHaveCount(0);
});

test("Sales can manage the pipeline but not create projects or invite users", async ({ page }) => {
  const id = unique();
  const ownerEmail = `owner-sales-${id}@example.com`;
  const salesEmail = `sales-${id}@example.com`;
  const password = "password123";

  await page.goto("/signup");
  await field(page, "orgName").fill(`Sales RBAC Org ${id}`);
  await field(page, "name").fill("Sales RBAC Owner");
  await field(page, "email").fill(ownerEmail);
  await field(page, "password").fill(password);
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL("/");

  await inviteAndSetPassword(page, "Sales Persona", salesEmail, "SALES", password);

  // allowed: creating a lead is a pipeline action
  await page.goto("/leads/new");
  await expect(page.getByRole("button", { name: "Add lead" })).toBeVisible();

  // forbidden: project creation and user management are not pipeline actions
  await page.goto("/projects/new");
  await expect(page.getByRole("button", { name: "Create project" })).toHaveCount(0);

  await page.goto("/users/new");
  await expect(page.getByRole("heading", { name: "Invite user" })).toHaveCount(0);
});

test("Admin cannot grant the Owner role when inviting", async ({ page }) => {
  const id = unique();
  const ownerEmail = `owner-admingrant-${id}@example.com`;
  const adminEmail = `admin-grant-${id}@example.com`;
  const password = "password123";

  await page.goto("/signup");
  await field(page, "orgName").fill(`Admin Grant Org ${id}`);
  await field(page, "name").fill("Grant Test Owner");
  await field(page, "email").fill(ownerEmail);
  await field(page, "password").fill(password);
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL("/");

  await inviteAndSetPassword(page, "Admin Persona", adminEmail, "ADMIN", password);

  // now signed in as the Admin persona — the role dropdown they're invited
  // through should not offer OWNER at all
  await page.goto("/users/new");
  const roleOptions = await field(page, "role").locator("option").allTextContents();
  expect(roleOptions.join(" ")).not.toContain("Owner");
});
