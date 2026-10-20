import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Customers", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "View Ananya Mehta", exact: true })
    .click();
}
async function enableAIControls(page: Page) {
  await page.route("**/api/bootstrap", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: { ...(await response.json()), aiConfigured: true },
    });
  });
}

test("AI review evidence, order controls, and honest fallback", async ({
  page,
}) => {
  await enableAIControls(page);
  await page.route(
    "**/api/customers/customer-1/shortlist-review",
    async (route) => {
      const response = await page.request.get(
        "/api/customers/customer-1/matches",
      );
      const report = await response.json();
      const matches = report.matches.slice(0, 8).reverse();
      await route.fulfill({
        json: {
          source: "ai",
          summary:
            "Review shared plans and confirm the practical relocation details.",
          reviewed: matches.length,
          generatedAt: new Date().toISOString(),
          items: matches.map(
            (match: { candidate: { id: string }; questions: string[] }) => ({
              candidateId: match.candidate.id,
              rationale: "Their stated plans are worth discussing together.",
              evidenceIds: ["children"],
              question:
                "What would raising a family look like for both of you?",
              facts: [
                {
                  id: "children",
                  label: "Children plans",
                  customer: "Yes",
                  candidate: "Yes",
                  kind: "alignment",
                },
              ],
              concerns: match.questions,
            }),
          ),
        },
      });
    },
  );
  await login(page);
  await expect(
    page.getByText("The Date Crew", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Suggested matches/ }).click();
  await page
    .getByRole("button", { name: "Review with AI", exact: true })
    .click();
  await expect(
    page.getByText(
      "Review shared plans and confirm the practical relocation details.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "AI review order", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "AI review order", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: /Read review/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Supporting profile facts" }),
  ).toBeVisible();
  await expect(
    page.getByText("What would raising a family look like for both of you?"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.unroute("**/api/customers/customer-1/shortlist-review");
  await page
    .getByRole("button", { name: "Review with AI again", exact: true })
    .click();
  await expect(
    page.getByText(
      "AI is not connected. Your mutual-fit shortlist is still available.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send Match", exact: true }).first(),
  ).toBeVisible();
});

test("AI preference preview is read-only until Apply and survives refresh", async ({
  page,
}) => {
  await enableAIControls(page);
  await page.route(
    "**/api/customers/customer-1/preference-proposals",
    async (route) => {
      const response = await page.request.get("/api/bootstrap");
      const data = await response.json();
      const before = data.customers.find(
        (customer: { id: string }) => customer.id === "customer-1",
      ).profile.preferences;
      await route.fulfill({
        json: {
          status: "ready",
          proposalId: "browser-proposal",
          before,
          after: { ...before, maxAge: 37 },
          changes: [
            {
              field: "maxAge",
              label: "Maximum age",
              before: String(before.maxAge),
              after: "37",
              quote: "Maximum age 37",
            },
          ],
          eligibleBefore: 64,
          eligibleAfter: 64,
          questions: [],
          unsupported: [],
        },
      });
    },
  );
  // The real API's proposal validation is covered by integration tests. Here we
  // control the provider boundary to test the user's preview/apply interaction.
  await page.route(
    "**/api/customers/customer-1/preference-proposals/browser-proposal/apply",
    async (route) => {
      const response = await page.request.get("/api/bootstrap");
      const data = await response.json();
      const before = data.customers.find(
        (customer: { id: string }) => customer.id === "customer-1",
      ).profile.preferences;
      const applied = await page.request.patch(
        "/api/customers/customer-1/preferences",
        { data: { ...before, maxAge: 37 } },
      );
      await route.fulfill({
        status: applied.status(),
        json: await applied.json(),
      });
    },
  );
  await login(page);
  await page
    .getByRole("button", { name: "Edit partner preferences", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Describe with AI", exact: true })
    .click();
  await page
    .getByLabel("Describe the changes you have in mind")
    .fill("Maximum age 37, keep all other preferences.");
  await page
    .getByRole("button", { name: "Preview with AI", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review proposed changes" }),
  ).toBeVisible();
  await expect(page.getByText("Not saved", { exact: true })).toBeVisible();
  const unchanged = await (await page.request.get("/api/bootstrap")).json();
  expect(
    unchanged.customers.find(
      (customer: { id: string }) => customer.id === "customer-1",
    ).profile.preferences.maxAge,
  ).toBe(42);
  await page
    .getByRole("button", { name: "Apply preferences", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Edit partner preferences", exact: true })
    .click();
  await expect(page.getByLabel("Maximum age", { exact: true })).toHaveValue(
    "37",
  );
});

test("Send Match previews and records exactly one mock email", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("tab", { name: /Suggested matches/ }).click();
  const button = page
    .getByRole("button", { name: "Send Match", exact: true })
    .first();
  await button.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate with AI", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Send mock email", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Match sent", exact: true }).first(),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Match sent", exact: true }).first(),
  ).toBeDisabled();
});
