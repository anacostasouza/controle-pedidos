import { describe, expect, it } from "vitest";
import {
  capitalizeFirstLetter,
  capitalizeWords,
  isStatusConcluido,
  formatDateTime,
  formatTimeDiff,
} from "./FormatUtils";

describe("FormatUtils", () => {
  it("capitalizeFirstLetter capitaliza a primeira letra", () => {
    expect(capitalizeFirstLetter("teste")).toBe("Teste");
  });

  it("capitalizeWords capitaliza palavras", () => {
    expect(capitalizeWords("grafica rapida")).toBe("Grafica Rapida");
  });

  it("isStatusConcluido reconhece equivalencias", () => {
    expect(isStatusConcluido("Concluído")).toBe(true);
    expect(isStatusConcluido("concluida")).toBe(true);
  });

  it("formatDateTime retorna valor formatado", () => {
    const date = new Date("2024-01-02T03:04:00Z");
    const formatted = formatDateTime(date);
    expect(formatted).toContain("/");
    expect(formatted).toContain(":");
  });

  it("formatTimeDiff calcula diferenca", () => {
    const inicio = new Date("2024-01-01T00:00:00Z");
    const fim = new Date("2024-01-01T02:30:00Z");
    expect(formatTimeDiff(inicio, fim)).toBe("02:30");
  });
});
