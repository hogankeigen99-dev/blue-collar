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

test("flagging a project at risk surfaces it on the project page, the projects list, and the dashboard", async ({ page }) => {
  const id = unique();
  await signUp(page, id);

  await page.goto("/projects/new");
  await field(page, "title").fill(`At Risk Project ${id}`);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name: `At Risk Project ${id}` })).toBeVisible();

  // badges are ".rounded-full" spans — scoping past the health <select>'s own
  // "At risk" <option> text, which getByText would otherwise also match
  const riskBadge = page.locator("span.rounded-full", { hasText: "At risk" });
  await expect(riskBadge).toHaveCount(0);

  await field(page, "health").selectOption("AT_RISK");
  await field(page, "healthNote").fill("Permit delayed");
  await page.locator('form:has(select[name="health"]) button[type="submit"]').click();

  await expect(riskBadge.first()).toBeVisible();
  await expect(page.getByText("Permit delayed")).toBeVisible();

  await page.goto("/projects");
  await expect(
    page.locator("a", { hasText: `At Risk Project ${id}` }).locator("span.rounded-full", { hasText: "At risk" })
  ).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("project flagged at risk")).toBeVisible();
});
