import request from "supertest";

const mockVerifyIdToken = jest.fn();

jest.mock("firebase-admin", () => ({
  auth: () => ({
    verifyIdToken: mockVerifyIdToken,
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
    deleteUser: jest.fn(),
  }),
  firestore: () => ({
    collection: () => ({
      get: jest.fn().mockResolvedValue({ docs: [] }),
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      }),
      doc: () => ({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ setorNome: "SUPORTE" }) }),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      }),
    }),
  }),
}));

import { appUsuarios } from "../../usuarios/funcUsuarios";

describe("E2E CORS - usuariosApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({
      uid: "admin-1",
      email: "admin@desenhardigital.com.br",
    });
  });

  it("bloqueia origem não permitida com 403", async () => {
    const response = await request(appUsuarios)
      .get("/usuarios/listar")
      .set("Origin", "https://evil.example.com");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Origin not allowed" });
  });

  it("responde preflight OPTIONS para origem permitida", async () => {
    const response = await request(appUsuarios)
      .options("/usuarios/listar")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "GET");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("mantém cabeçalhos CORS em rota protegida sem token", async () => {
    const response = await request(appUsuarios)
      .get("/usuarios/listar")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(401);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.body).toEqual({ message: "Não autenticado" });
  });
});
