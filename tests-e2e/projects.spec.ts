import { test, expect } from "@playwright/test";
import { unique, field } from "./helpers";

async function signUp(page: import("@playwright/test").Page, id: string) {
  await page.goto("/signup");
  await field(page, "orgName").fill(`Projects Org ${id}`);
  await field(page, "name").fill("Project Owner");
  await field(page, "email").fill(`projects-${id}@example.com`);
  await field(page, "password").fill("password123");
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL("/");
}

test("create a project, add a task, and mark it done", async ({ page }) => {
  const id = unique();
  await signUp(page, id);

  await page.goto("/projects/new");
  await field(page, "title").fill(`Rewire Panel ${id}`);
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page.getByRole("heading", { name: `Rewire Panel ${id}` })).toBeVisible();

  await page.getByRole("link", { name: "Tasks" }).click();
  await expect(page).toHaveURL(/\/tasks$/);

  await field(page, "title").fill("Replace breaker");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Replace breaker")).toBeVisible();

  // the task's own status select renders after the add-task form's assignee
  // select, so it's the last <select> on the page
  const statusSelect = page.locator("select").last();
  await statusSelect.selectOption("DONE");
  await expect(statusSelect).toHaveValue("DONE");
});
