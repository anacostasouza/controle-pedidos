import request from "supertest";
import { appControlePedidos } from "../../controle-pedidos/funcControlePedidos";

const mockVerifyIdToken = jest.fn();
const mockUserDocGet = jest.fn();
const mockPedidosGet = jest.fn();
const mockPedidosCountGet = jest.fn();

const mockPedidosQuery = {
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: mockPedidosGet,
  count: jest.fn().mockReturnValue({
    get: mockPedidosCountGet,
  }),
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
        return mockPedidosQuery;
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
  }),
}));

describe("E2E - apiControlePedidos", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: "user-123",
      email: "user@desenhardigital.com.br",
      name: "Usuario Teste",
    });

    mockUserDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        statusConta: true,
        setor: "PRODUCAO",
        setorNome: "Producao",
        displayName: "Usuario Teste",
      }),
    });

    mockPedidosGet.mockResolvedValue({
      docs: [
        {
          id: "pedido-1",
          data: () => ({
            nomeCliente: "CLIENTE TESTE",
            prazos: { entrega: { _seconds: 1710000000 } },
          }),
        },
      ],
    });

    mockPedidosCountGet.mockResolvedValue({
      data: () => ({ count: 1 }),
    });
  });

  it("retorna 401 quando não há token", async () => {
    const response = await request(appControlePedidos)
      .get("/dashboard/buscarPedidos?itensPorPagina=1")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Não autenticado" });
  });

  it("bloqueia origin desconhecida com 403", async () => {
    const response = await request(appControlePedidos)
      .get("/dashboard/buscarPedidos?itensPorPagina=1")
      .set("Origin", "https://evil.example.com");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Origin not allowed" });
  });

  it("retorna pedidos quando usuário está autorizado", async () => {
    const response = await request(appControlePedidos)
      .get("/dashboard/buscarPedidos?itensPorPagina=1")
      .set("Authorization", "Bearer token-valido")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(Array.isArray(response.body.pedidos)).toBe(true);
    expect(response.body.pedidos[0].id).toBe("pedido-1");
  });
});
