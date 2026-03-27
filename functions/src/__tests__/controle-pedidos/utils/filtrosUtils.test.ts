import { Timestamp } from "firebase-admin/firestore";
import { aplicarFiltrosPedidos } from "../../../controle-pedidos/utils/filtrosUtils";

describe("filtrosUtils - Controle de Pedidos", () => {
  let mockQuery: any;

  beforeEach(() => {
    // Mock simples da query do Firestore
    mockQuery = {
      where: jest.fn().mockReturnThis(),
    } as any;
  });

  describe("aplicarFiltrosPedidos", () => {
    test("deve aplicar filtro de tipo de serviço", () => {
      const filtros = { filtroTipo: "Impressão" };
      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("servico.tipo", "==", "Impressão");
    });

    test("deve aplicar filtro de subtipo de serviço", () => {
      const filtros = { filtroSubTipo: "Banner" };
      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("servico.subTipo", "==", "Banner");
    });

    test("deve aplicar filtro de responsável", () => {
      const filtros = { filtroResponsavelUid: "uid123" };
      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("responsavelUid", "==", "uid123");
    });

    test("deve filtrar cliente por número de pedido (numérico)", () => {
      const filtros = { filtroCliente: "12345" };
      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("numeroPedido", "==", 12345);
    });

    test("deve filtrar cliente por nome (string)", () => {
      const filtros = { filtroCliente: "Cliente ABC" };
      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("nomeCliente", "==", "CLIENTE ABC");
    });

    test("deve converter nome do cliente para maiúsculas", () => {
      const filtros = { filtroCliente: "empresa xyz" };
      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("nomeCliente", "==", "EMPRESA XYZ");
    });

    test("deve aplicar filtro requerArte true", () => {
      const filtros = { filtroRequerArte: "true" };
      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("requerArte", "==", true);
    });

    test("deve aplicar filtro requerArte false", () => {
      const filtros = { filtroRequerArte: "false" };
      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("requerArte", "==", false);
    });

    test("deve aplicar filtro requerGalpao true", () => {
      const filtros = { filtroRequerGalpao: "true" };
      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("requerGalpao", "==", true);
    });

    test("deve aplicar filtro requerGalpao false", () => {
      const filtros = { filtroRequerGalpao: "false" };
      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("requerGalpao", "==", false);
    });

    describe("Filtros de Status - Prioridade", () => {
      test("não deve aplicar filtro de status duplicado", () => {
        const filtros = { filtroStatus: "Em Produção" };
        aplicarFiltrosPedidos(mockQuery, filtros);

        // Contar quantas vezes .where("statusAtual", ...) foi chamado
        const statusCalls = mockQuery.where.mock.calls.filter(
          (call: any[]) => call[0] === "statusAtual"
        );
        expect(statusCalls.length).toBe(1);
        expect(statusCalls[0]).toEqual(["statusAtual", "==", "Em Produção"]);
      });

      test("filtroAtrasados tem máxima prioridade e bloqueia outros status", () => {
        const filtros = {
          filtroAtrasados: "true",
          filtroStatus: "Em Produção",
        };
        aplicarFiltrosPedidos(mockQuery, filtros);

        expect(mockQuery.where).toHaveBeenCalledWith(
          "statusAtual",
          "not-in",
          ["Entregue", "Concluído"]
        );

        const statusCallsExact = mockQuery.where.mock.calls.filter(
          (call: any[]) => call[0] === "statusAtual" && call[1] === "=="
        );
        expect(statusCallsExact.length).toBe(0);
      });

      test("filtroStatus tem segunda prioridade sobre ocultarEntregues", () => {
        const filtros = {
          filtroStatus: "Em Produção",
          filtroOcultarEntregues: "true",
        };
        aplicarFiltrosPedidos(mockQuery, filtros);

        expect(mockQuery.where).toHaveBeenCalledWith("statusAtual", "==", "Em Produção");

        const notInCalls = mockQuery.where.mock.calls.filter(
          (call: any[]) => call[1] === "not-in"
        );
        expect(notInCalls.length).toBe(0);
      });

      test("filtroOcultarEntregues é aplicado quando nenhum status está ativo", () => {
        const filtros = {
          filtroOcultarEntregues: "true",
        };
        aplicarFiltrosPedidos(mockQuery, filtros);

        expect(mockQuery.where).toHaveBeenCalledWith(
          "statusAtual",
          "not-in",
          ["Entregue"]
        );
      });

      test("nenhum filtro de status quando todos são falsos/ausentes", () => {
        const filtros = {};
        aplicarFiltrosPedidos(mockQuery, filtros);

        const statusCalls = mockQuery.where.mock.calls.filter(
          (call: any[]) => call[0] === "statusAtual"
        );
        expect(statusCalls.length).toBe(0);
      });
    });

    test("deve combinar múltiplos filtros sem duplicatas", () => {
      const filtros = {
        filtroTipo: "Impressão",
        filtroSubTipo: "Banner",
        filtroStatus: "Em Produção",
        filtroResponsavelUid: "uid123",
        filtroCliente: "Cliente ABC",
        filtroRequerArte: "true",
        filtroRequerGalpao: "false",
      };

      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("servico.tipo", "==", "Impressão");
      expect(mockQuery.where).toHaveBeenCalledWith("servico.subTipo", "==", "Banner");
      expect(mockQuery.where).toHaveBeenCalledWith("statusAtual", "==", "Em Produção");
      expect(mockQuery.where).toHaveBeenCalledWith("responsavelUid", "==", "uid123");
      expect(mockQuery.where).toHaveBeenCalledWith("nomeCliente", "==", "CLIENTE ABC");
      expect(mockQuery.where).toHaveBeenCalledWith("requerArte", "==", true);
      expect(mockQuery.where).toHaveBeenCalledWith("requerGalpao", "==", false);

      const statusCalls = mockQuery.where.mock.calls.filter(
        (call: any[]) => call[0] === "statusAtual"
      );
      expect(statusCalls.length).toBe(1);
    });

    test("deve retornar a queryRef modificada para encadeamento", () => {
      const filtros = { filtroTipo: "Impressão" };
      const result = aplicarFiltrosPedidos(mockQuery, filtros);

      expect(result).toBe(mockQuery);
    });

    test("deve ignorar filtros vazios ou undefined", () => {
      const filtros = {
        filtroTipo: undefined,
        filtroSubTipo: "",
        filtroStatus: null,
        filtroResponsavelUid: "",
      };

      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).not.toHaveBeenCalled();
    });

    test("deve tratar filtros case-insensitive para números", () => {
      const filtros = { filtroCliente: "00123" };
      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("numeroPedido", "==", 123);
    });

    test("não deve aplicar where se cliente for vazio", () => {
      const filtros = { filtroCliente: "" };
      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).not.toHaveBeenCalled();
    });

    test("deve aplicar Timestamp.now() em filtroAtrasados", () => {
      const filtros = { filtroAtrasados: "true" };
      const beforeCall = Date.now();
      aplicarFiltrosPedidos(mockQuery, filtros);
      const afterCall = Date.now();

      const timestampCall = mockQuery.where.mock.calls.find(
        (call: any[]) => call[0] === "prazos.entrega" && call[1] === "<"
      );

      expect(timestampCall).toBeDefined();
      expect(timestampCall[2]).toBeInstanceOf(Timestamp);

      const callTimestamp = (timestampCall[2] as Timestamp).toDate().getTime();
      expect(callTimestamp).toBeGreaterThanOrEqual(beforeCall);
      expect(callTimestamp).toBeLessThanOrEqual(afterCall + 100);
    });
  });

  describe("Casos de uso realistas", () => {
    test("filtro de pedidos atrasados em produção", () => {
      const filtros = {
        filtroAtrasados: "true",
        filtroTipo: "Impressão",
      };

      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("servico.tipo", "==", "Impressão");
      expect(mockQuery.where).toHaveBeenCalledWith(
        "statusAtual",
        "not-in",
        ["Entregue", "Concluído"]
      );
      expect(mockQuery.where).toHaveBeenCalledWith(
        "prazos.entrega",
        "<",
        expect.any(Timestamp)
      );
    });

    test("filtro de pedidos em produção por responsável", () => {
      const filtros = {
        filtroStatus: "Em Produção",
        filtroResponsavelUid: "uid456",
      };

      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith("statusAtual", "==", "Em Produção");
      expect(mockQuery.where).toHaveBeenCalledWith("responsavelUid", "==", "uid456");
    });

    test("filtro dashboard: sem entregues, por tipo e subtipo", () => {
      const filtros = {
        filtroOcultarEntregues: "true",
        filtroTipo: "Gravação",
        filtroSubTipo: "Laser",
      };

      aplicarFiltrosPedidos(mockQuery, filtros);

      expect(mockQuery.where).toHaveBeenCalledWith(
        "statusAtual",
        "not-in",
        ["Entregue"]
      );
      expect(mockQuery.where).toHaveBeenCalledWith("servico.tipo", "==", "Gravação");
      expect(mockQuery.where).toHaveBeenCalledWith("servico.subTipo", "==", "Laser");
    });
  });
});
