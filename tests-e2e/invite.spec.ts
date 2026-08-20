import { test, expect } from "@playwright/test";
import { unique, field } from "./helpers";

test("admin invites a user, who sets a password and lands on the dashboard", async ({ page }) => {
  const id = unique();
  const inviteeEmail = `invitee-${id}@example.com`;

  await page.goto("/signup");
  await field(page, "orgName").fill(`Invite Org ${id}`);
  await field(page, "name").fill("Admin Owner");
  await field(page, "email").fill(`admin-${id}@example.com`);
  await field(page, "password").fill("password123");
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/users/new");
  await field(page, "name").fill("Invited Tech");
  await field(page, "email").fill(inviteeEmail);
  await page.getByRole("button", { name: "Invite user" }).click();

  const linkText = await page.locator("code").innerText();
  const match = linkText.match(/\/set-password\?token=\S+/);
  expect(match).toBeTruthy();
  const setPasswordPath = match![0];

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto(setPasswordPath);
  await field(page, "password").fill("newpassword123");
  await field(page, "confirmPassword").fill("newpassword123");
  await page.getByRole("button", { name: "Set password" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Invited Tech")).toBeVisible();
});
