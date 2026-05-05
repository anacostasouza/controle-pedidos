import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AtendimentoForm } from "./AtendimentoForm";
import * as services from "../../../services/AtendimentoServices";

vi.mock("../../../services/AtendimentoServices", () => ({
  buscarServicosAtendimento: vi.fn(),
  criarAtendimentoFila: vi.fn(),
}));

describe("AtendimentoForm", () => {
  const mockedBuscar = vi.mocked(services.buscarServicosAtendimento);
  const mockedCriar = vi.mocked(services.criarAtendimentoFila);

  beforeEach(() => {
    mockedBuscar.mockResolvedValue([{ tipo: "Consulta" }]);
    mockedCriar.mockResolvedValue({} as never);
  });

  it("envia atendimento com dados do formulario", async () => {
    const user = userEvent.setup();
    render(<AtendimentoForm />);

    await screen.findByText("Consulta");

    await user.type(screen.getByPlaceholderText("Nome completo"), "Cliente Teste");
    await user.click(screen.getByLabelText("Consulta"));
    await user.click(screen.getByRole("button", { name: "Convencional" }));

    expect(mockedCriar).toHaveBeenCalledWith({
      nomeCliente: "Cliente Teste",
      tipoAtendimento: "Consulta",
      prioridade: "convencional",
    });

    expect(
      await screen.findByText(/Atendimento criado com sucesso/i)
    ).toBeInTheDocument();
  });
});
