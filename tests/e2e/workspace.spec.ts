import { expect, test } from "@playwright/test";

test("customer search, full biodata, notes, and a transparent shortlist", async ({
  page,
}) => {
  // Keep the core workflow usable while Vercel and Render roll out separately.
  await page.route("**/api/bootstrap", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    delete data.aiAssistanceAvailable;
    await route.fulfill({ response, json: data });
  });
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill("priya");
  await page.getByLabel("Password", { exact: true }).fill("TdcDemo2026!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
  await page.getByRole("textbox", { name: "Search customers" }).fill("Ananya");
  await page
    .getByRole("link", { name: "View Ananya Mehta", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ananya Mehta" }),
  ).toBeVisible();
  await expect(
    page.getByText("Undergraduate college", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Notes & activity/ }).click();
  const note = `Browser check ${Date.now()}: confirm preferred meeting format.`;
  await page.getByLabel("Your note").fill(note);
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /Suggested matches/ }).click();
  await expect(
    page.getByRole("heading", { name: "Suggested matches" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "AI shortlist review" }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Send Match", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByText("Template draft", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This records a mock email. No real email will be delivered.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
});

test("mobile navigation and profile pool", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("link", { name: "Candidate pool 200", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Candidate pool" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Filter profile pool by gender" })
    .selectOption("Female");
  await expect(page.getByText("100 profiles", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 355, height: 844 });
  await page.goto("/customers/customer-1?tab=matches");
  await expect(
    page.getByRole("heading", { name: "AI shortlist review", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(355);
});
