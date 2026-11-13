import request from "supertest";
import { appControlePedidos } from "../../controle-pedidos/funcControlePedidos";

const mockVerifyIdToken = jest.fn();
const mockUserDocGet = jest.fn();
const mockPedidoDocGet = jest.fn();
const mockPedidoDocDelete = jest.fn();
const mockPedidoDocSet = jest.fn();
const mockLogDocGet = jest.fn();
const mockLogDocSet = jest.fn();
const mockLogDocUpdate = jest.fn();
const mockLogsQueryGet = jest.fn();

const mockLogsQuery = {
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: mockLogsQueryGet,
};

jest.mock("firebase-admin", () => ({
  auth: () => ({
    verifyIdToken: mockVerifyIdToken,
    getUser: jest.fn(),
  }),
  firestore: () => ({
    collection: (name: string) => {
      if (name === "usuarios") {
        return {
          doc: () => ({
            get: mockUserDocGet,
          }),
        };
      }
      if (name === "pedidos") {
        return {
          doc: (id: string) => ({
            get: mockPedidoDocGet,
            delete: mockPedidoDocDelete,
            set: mockPedidoDocSet,
          }),
        };
      }
      if (name === "pedidos_excluidos") {
        return {
          doc: (id: string) => ({
            get: mockLogDocGet,
            set: mockLogDocSet,
            update: mockLogDocUpdate,
          }),
          where: mockLogsQuery.where,
          orderBy: mockLogsQuery.orderBy,
          limit: mockLogsQuery.limit,
          get: mockLogsQuery.get,
        };
      }
      throw new Error(`Unexpected collection: ${name}`);
    },
  }),
}));

describe("Auditoria de Pedidos Excluídos", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: "user-test",
      email: "user@desenhardigital.com.br",
      name: "Usuário Teste",
    });

    mockUserDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        statusConta: true,
        setor: "SUPORTE",
        setorNome: "Suporte",
        displayName: "Usuário Teste",
      }),
    });
  });

  describe("DELETE /dashboard/deletarPedido", () => {
    it("deve criar snapshot em pedidos_excluidos e deletar de pedidos", async () => {
      mockPedidoDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          numeroPedido: 12345,
          cliente: { nome: "Empresa Teste" },
          statusAtual: "Em Produção",
          servico: { valorTotal: 350.5 },
        }),
      });

      const response = await request(appControlePedidos)
        .delete("/dashboard/deletarPedido")
        .set("Authorization", "Bearer token-valido")
        .set("Origin", "http://localhost:5173")
        .send({
          pedidoID: "ped-123",
          motivo: "Cancelado pelo cliente",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Pedido deletado com sucesso");

      // Validar gravação na auditoria
      expect(mockLogDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "ped-123",
          numeroPedido: 12345,
          motivo: "Cancelado pelo cliente",
          restaurado: false,
          excluidoPor: expect.objectContaining({
            uid: "user-test",
            setor: "SUPORTE",
          }),
        })
      );

      // Validar deleção do pedido ativo
      expect(mockPedidoDocDelete).toHaveBeenCalled();
    });

    it("retorna 400 se pedidoID não for fornecido", async () => {
      const response = await request(appControlePedidos)
        .delete("/dashboard/deletarPedido")
        .set("Authorization", "Bearer token-valido")
        .set("Origin", "http://localhost:5173")
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe("Controle de Acesso - Setor", () => {
    it("deve bloquear setor BALCAO com 403 em /dashboard/pedidosExcluidos", async () => {
      mockUserDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          statusConta: true,
          setor: "BALCAO",
          setorNome: "Balcão",
        }),
      });

      const response = await request(appControlePedidos)
        .get("/dashboard/pedidosExcluidos")
        .set("Authorization", "Bearer token-valido")
        .set("Origin", "http://localhost:5173");

      expect(response.status).toBe(403);
    });

    it("deve permitir setor SUPORTE acessar /dashboard/pedidosExcluidos", async () => {
      mockLogsQueryGet.mockResolvedValueOnce({
        docs: [
          {
            id: "ped-1",
            data: () => ({
              pedidoId: "ped-1",
              numeroPedido: 100,
              cliente: { nome: "Cliente A" },
              motivo: "Duplicado",
              excluidoPor: { nome: "Admin" },
              excluidoEm: { _seconds: 1700000000 },
              restaurado: false,
            }),
          },
        ],
      });

      const response = await request(appControlePedidos)
        .get("/dashboard/pedidosExcluidos")
        .set("Authorization", "Bearer token-valido")
        .set("Origin", "http://localhost:5173");

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.logs[0].id).toBe("ped-1");
    });
  });

  describe("POST /dashboard/restaurarPedido", () => {
    it("deve restaurar pedido ativo e atualizar log para restaurado: true", async () => {
      mockLogDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          pedidoId: "ped-123",
          dadosOriginais: {
            numeroPedido: 12345,
            cliente: { nome: "Empresa Teste" },
            statusAtual: "Em Produção",
          },
          restaurado: false,
        }),
      });

      // Pedido não existe mais na coleção ativa
      mockPedidoDocGet.mockResolvedValueOnce({
        exists: false,
      });

      const response = await request(appControlePedidos)
        .post("/dashboard/restaurarPedido")
        .set("Authorization", "Bearer token-valido")
        .set("Origin", "http://localhost:5173")
        .send({ pedidoID: "ped-123" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Pedido restaurado com sucesso!");
      expect(mockPedidoDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          numeroPedido: 12345,
        })
      );
      expect(mockLogDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurado: true,
        })
      );
    });
  });
});

