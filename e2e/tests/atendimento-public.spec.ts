import { expect, test } from "@playwright/test";

test.describe("Atendimento publico", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "atendimento", "Projeto errado");
  });

  test("cria atendimento pela pagina inicial", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Nome completo").fill("Cliente E2E");
    await page.getByLabel("Consulta").check();
    await page.getByRole("button", { name: "Convencional" }).click();

    const mensagem = page.locator(".mensagem");
    await expect(mensagem).toBeVisible();
    await expect(mensagem).toContainText(/Atendimento criado com sucesso/i);
  });
});
