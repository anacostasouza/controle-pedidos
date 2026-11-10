import { Timestamp } from "firebase-admin/firestore";
import {
  aplicarFiltrosPedidos,
  filtrarPedidosEmMemoria,
  ordenarPedidosPorEntrega,
} from "../../../controle-pedidos/utils/filtrosUtils";

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

  describe("filtrarPedidosEmMemoria e ordenarPedidosPorEntrega", () => {
    const nowMs = new Date("2026-11-10T12:00:00Z").getTime();
    const pastTs = { _seconds: Math.floor((nowMs - 86400000) / 1000), _nanoseconds: 0 };
    const futureTs = { _seconds: Math.floor((nowMs + 86400000) / 1000), _nanoseconds: 0 };

    const samplePedidos = [
      {
        id: "p1",
        numeroPedido: 1001,
        nomeCliente: "PADARIA ESTRELA LTDA",
        servico: { tipo: "IMPRESSAO_DIGITAL", subTipo: null },
        responsavel: "Ana Souza",
        responsavelUid: "uid-ana",
        statusAtual: "Em Produção",
        requerArte: true,
        requerGalpao: false,
        prazos: { entrega: pastTs },
      },
      {
        id: "p2",
        numeroPedido: 1002,
        nomeCliente: "MERCADO CENTRAL",
        servico: { tipo: "COMUNICACAO_VISUAL", subTipo: "PLACA_SIMPLES" },
        responsavel: "João Silva",
        responsavelUid: "uid-joao",
        responsavelNomeNormalizado: "JOAO SILVA",
        statusAtual: "Entregue",
        requerArte: false,
        requerGalpao: true,
        prazos: { entrega: pastTs },
      },
      {
        id: "p3",
        numeroPedido: 1003,
        nomeCliente: "PADARIA CENTRAL",
        servico: { tipo: "IMPRESSAO_DIGITAL", subTipo: null },
        responsavel: "João Silva",
        responsavelUid: "uid-joao",
        statusAtual: "Novo",
        requerArte: true,
        requerGalpao: false,
        prazos: { entrega: futureTs },
      },
    ];

    test("filtra cliente por nome parcial ignorando acentos e caixa", () => {
      const res = filtrarPedidosEmMemoria(samplePedidos, { filtroCliente: "padaria" }, nowMs);
      expect(res.map((p) => p.id)).toEqual(["p1", "p3"]);
    });

    test("filtra numeroPedido com espaços ao redor", () => {
      const res = filtrarPedidosEmMemoria(samplePedidos, { filtroCliente: " 1002 " }, nowMs);
      expect(res.map((p) => p.id)).toEqual(["p2"]);
    });

    test("filtra responsável por prefixo mesmo em pedidos legados sem responsavelNomeNormalizado", () => {
      const res = filtrarPedidosEmMemoria(
        samplePedidos,
        { filtroResponsavelNomePrefixo: "joão" },
        nowMs
      );
      expect(res.map((p) => p.id)).toEqual(["p2", "p3"]);
    });

    test("combina filtroResponsavelNomePrefixo com filtroAtrasados e filtroOcultarEntregues sem conflitos", () => {
      const res = filtrarPedidosEmMemoria(
        samplePedidos,
        {
          filtroResponsavelNomePrefixo: "Ana",
          filtroAtrasados: "true",
          filtroOcultarEntregues: "true",
        },
        nowMs
      );
      expect(res.map((p) => p.id)).toEqual(["p1"]);
    });

    test("ordena pedidos por data de entrega crescente", () => {
      const sorted = ordenarPedidosPorEntrega([samplePedidos[2], samplePedidos[0]]);
      expect(sorted.map((p) => p.id)).toEqual(["p1", "p3"]);
    });

    test("exigirCamposDashboard descarta registros incompletos e pedidos entregues (por status ou entregueEm)", () => {
      const pedidosMistos = [
        ...samplePedidos,
        {
          id: "p-incompleto",
          numeroPedido: 1004,
          nomeCliente: "INCOMPLETO",
          statusAtual: "Novo",
          // sem servico e sem prazos
        },
        {
          id: "p-entregue-em",
          numeroPedido: 1005,
          nomeCliente: "ENTREGUE COM DATA",
          servico: { tipo: "IMPRESSAO_DIGITAL", subTipo: null },
          statusAtual: "Concluído",
          entregueEm: pastTs,
          prazos: { entrega: pastTs },
        },
        {
          id: "p-entregue-upper",
          numeroPedido: 1006,
          nomeCliente: "ENTREGUE MAIUSCULA",
          servico: { tipo: "IMPRESSAO_DIGITAL", subTipo: null },
          statusAtual: " ENTREGUE ",
          prazos: { entrega: pastTs },
        },
      ];

      const res = filtrarPedidosEmMemoria(
        pedidosMistos,
        { filtroOcultarEntregues: "true" },
        nowMs,
        { exigirCamposDashboard: true }
      );
      expect(res.map((p) => p.id)).toEqual(["p1", "p3"]);
    });
  });
});
