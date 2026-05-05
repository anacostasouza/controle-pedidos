import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Loading } from "./Loading";

describe("Loading", () => {
  it("renderiza a mensagem padrao", () => {
    render(<Loading />);
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("renderiza mensagem customizada", () => {
    render(<Loading message="Testando" />);
    expect(screen.getByText("Testando")).toBeInTheDocument();
  });
});
