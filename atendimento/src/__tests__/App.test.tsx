import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";
import * as services from "./services/AtendimentoServices";

vi.mock("./context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("./services/AtendimentoServices", () => ({
  buscarServicosAtendimento: vi.fn(),
  criarAtendimentoFila: vi.fn(),
}));

describe("App", () => {
  const mockedBuscar = vi.mocked(services.buscarServicosAtendimento);

  beforeEach(() => {
    mockedBuscar.mockResolvedValue([{ tipo: "Consulta" }]);
  });

  it("renderiza a tela de boas-vindas", async () => {
    render(<App />);
    expect(await screen.findByPlaceholderText("Nome completo")).toBeInTheDocument();
  });
});
