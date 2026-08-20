import { test, expect } from "@playwright/test";
import { unique, field } from "./helpers";

test("convert a lead into an approved estimate and then a project", async ({ page }) => {
  const id = unique();

  await page.goto("/signup");
  await field(page, "orgName").fill(`Leads Org ${id}`);
  await field(page, "name").fill("Sales Owner");
  await field(page, "email").fill(`leads-${id}@example.com`);
  await field(page, "password").fill("password123");
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/leads/new");
  await field(page, "name").fill(`Acme Roofing ${id}`);
  await page.getByRole("button", { name: "Add lead" }).click();
  await expect(page).toHaveURL(/\/leads\/.+/);
  await expect(page.getByRole("heading", { name: `Acme Roofing ${id}` })).toBeVisible();

  await page.getByRole("button", { name: "+ Create estimate" }).click();
  await expect(page).toHaveURL(/\/estimates\/.+/);

  await field(page, "description").fill("Roof inspection");
  await field(page, "quantity").fill("2");
  await field(page, "unitPrice").fill("150");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Roof inspection")).toBeVisible();

  await field(page, "status").selectOption("APPROVED");
  await page.getByRole("button", { name: "Update" }).click();

  await page.getByRole("button", { name: "Convert to project" }).click();
  await expect(page).toHaveURL(/\/projects\/.+/);
});
