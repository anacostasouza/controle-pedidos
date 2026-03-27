import { validarFiltros } from "../../../atendimento/utils/filtrosUtils";

describe("filtrosUtils - Atendimento - Validação", () => {
  describe("validarFiltros", () => {
    test("deve validar datas obrigatórias", () => {
      const queryInvalido = {};
      const result = validarFiltros(queryInvalido);

      expect(result.valido).toBe(false);
      expect(result.erro).toContain("dataInicio");
      expect(result.erro).toContain("dataFim");
    });

    test("deve rejeitar datas inválidas", () => {
      const queryComDataInvalida = {
        dataInicio: "data-invalida",
        dataFim: "2024-01-31",
      };
      const result = validarFiltros(queryComDataInvalida);

      expect(result.valido).toBe(false);
      expect(result.erro).toContain("inválidas");
    });

    test("deve aceitar datas válidas no formato YYYY-MM-DD", () => {
      const queryValida = {
        dataInicio: "2024-01-01",
        dataFim: "2024-01-31",
      };
      const result = validarFiltros(queryValida);

      expect(result.valido).toBe(true);
      expect(result.erro).toBeUndefined();
    });

    test("deve aceitar datas em ISO format", () => {
      const queryValida = {
        dataInicio: "2024-01-01T00:00:00.000Z",
        dataFim: "2024-01-31T23:59:59.999Z",
      };
      const result = validarFiltros(queryValida);

      expect(result.valido).toBe(true);
      expect(result.erro).toBeUndefined();
    });

    test("deve rejeitar quando apenas dataInicio está presente", () => {
      const querySemDataFim = {
        dataInicio: "2024-01-01",
      };
      const result = validarFiltros(querySemDataFim);

      expect(result.valido).toBe(false);
      expect(result.erro).toContain("dataFim");
    });

    test("deve rejeitar quando apenas dataFim está presente", () => {
      const querySemDataInicio = {
        dataFim: "2024-01-31",
      };
      const result = validarFiltros(querySemDataInicio);

      expect(result.valido).toBe(false);
      expect(result.erro).toContain("dataInicio");
    });

    test("deve aceitar datas em diferentes formatos válidos", () => {
      const testCases = [
        { dataInicio: "2024-01-01", dataFim: "2024-01-31" },
        { dataInicio: "2024-01-01T00:00:00Z", dataFim: "2024-01-31T23:59:59Z" },
        { dataInicio: "2024/01/01", dataFim: "2024/01/31" },
      ];

      testCases.forEach(query => {
        const result = validarFiltros(query);
        expect(result.valido).toBe(true);
      });
    });

    test("deve rejeitar strings vazias para datas", () => {
      const queryComDataVazia = {
        dataInicio: "",
        dataFim: "2024-01-31",
      };
      const result = validarFiltros(queryComDataVazia);

      expect(result.valido).toBe(false);
    });

    test("deve extrair corretamente dataInicio e dataFim do query object", () => {
      const queryComFiltrosExtras = {
        dataInicio: "2024-01-01",
        dataFim: "2024-01-31",
        filtroStatus: "Finalizado",
        atendenteUid: "user123",
      };
      const result = validarFiltros(queryComFiltrosExtras);

      expect(result.valido).toBe(true);
      expect(result.erro).toBeUndefined();
    });
  });

  describe("Casos de uso", () => {
    test("deve validar para período de um mês completo", () => {
      const query = {
        dataInicio: "2024-03-01",
        dataFim: "2024-03-31",
      };
      const result = validarFiltros(query);

      expect(result.valido).toBe(true);
    });

    test("deve validar para período de um dia", () => {
      const query = {
        dataInicio: "2024-03-15",
        dataFim: "2024-03-15",
      };
      const result = validarFiltros(query);

      expect(result.valido).toBe(true);
    });

    test("deve validar para período de um ano completo", () => {
      const query = {
        dataInicio: "2024-01-01",
        dataFim: "2024-12-31",
      };
      const result = validarFiltros(query);

      expect(result.valido).toBe(true);
    });

    test("deve rejeitar datas com formato incorreto", () => {
      const invalidFormats = [
        { dataInicio: "01-01-2024", dataFim: "31-01-2024" }, // DD-MM-YYYY
        { dataInicio: "01/01/24", dataFim: "31/01/24" }, // DD/MM/YY
        { dataInicio: "2024-13-01", dataFim: "2024-01-31" }, // Mês inválido
        { dataInicio: "2024-01-32", dataFim: "2024-01-35" }, // Dia inválido
      ];

      invalidFormats.forEach(query => {
        const result = validarFiltros(query);
        expect(result.valido).toBe(false);
      });
    });
  });
});
