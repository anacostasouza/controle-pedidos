import request from "supertest";

const mockAdd = jest.fn();

jest.mock("firebase-admin", () => ({
  auth: () => ({
    verifyIdToken: jest.fn(),
    getUser: jest.fn(),
  }),
  firestore: () => ({
    collection: () => ({
      add: mockAdd,
      get: jest.fn().mockResolvedValue({ docs: [] }),
      doc: () => ({
        get: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      }),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    }),
  }),
}));

import { appAtendimento } from "../../atendimento/funcAtendimento";

describe("E2E CORS - atendimentoApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdd.mockResolvedValue({ id: "atendimento-1" });
  });

  it("bloqueia origem não permitida com 403", async () => {
    const response = await request(appAtendimento)
      .get("/filaAtendimento")
      .set("Origin", "https://evil.example.com");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Origin not allowed" });
  });

  it("responde preflight OPTIONS para origem permitida", async () => {
    const response = await request(appAtendimento)
      .options("/filaAtendimento")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "GET");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("mantém cabeçalhos CORS em rota protegida sem token", async () => {
    const response = await request(appAtendimento)
      .get("/filaAtendimento")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(401);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.body).toEqual({ message: "Não autenticado" });
  });

  it("permite rota pública com origem válida", async () => {
    const response = await request(appAtendimento)
      .post("/criarAtendimentoFila")
      .set("Origin", "http://localhost:5173")
      .send({
        nomeCliente: "Cliente Teste",
        tipoAtendimento: "Consulta",
        prioridade: "Alta",
      });

    expect(response.status).toBe(201);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.body).toEqual({ id: "atendimento-1" });
  });
});
