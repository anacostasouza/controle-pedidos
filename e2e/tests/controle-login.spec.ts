import { expect, test } from "@playwright/test";

test.describe("Controle de pedidos", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "controle-pedidos", "Projeto errado");
  });

  test("login de teste acessa dashboard", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("e2e-login").click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByRole("heading", { name: "Controle de Pedidos" })).toBeVisible();
  });
});
