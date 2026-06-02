import { expect, test } from "@playwright/test";

test.describe("Atendimento autenticado", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "atendimento", "Projeto errado");
  });

  test("login de teste acessa fila", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("e2e-login").click();
    await expect(page).toHaveURL(/fila-atendimento/);
    await expect(page.getByText(/Total na fila/i)).toBeVisible();
  });
});
