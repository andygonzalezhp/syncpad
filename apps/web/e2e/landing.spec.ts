import { expect, test } from "@playwright/test";

test("signed-out visitors can reach the landing page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /write together\.\s*stay on the same page\./i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Get started", exact: true }),
  ).toBeVisible();
});
