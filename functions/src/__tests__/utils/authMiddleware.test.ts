import type { Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../utils/authMiddleware";

const mockVerifyIdToken = jest.fn();
const mockDocGet = jest.fn();

jest.mock("firebase-admin", () => ({
  auth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        get: mockDocGet,
      }),
    }),
  }),
}));

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
  headersSent?: boolean;
};

function createMockResponse(): MockResponse {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    headersSent: false,
  } as unknown as MockResponse;

  res.status.mockReturnValue(res);
  return res;
}

describe("authMiddleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when authorization header is missing", async () => {
    const req = { headers: {} } as Request;
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    await authMiddleware(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Não autenticado" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user is not registered in Firestore", async () => {
    const req = { headers: { authorization: "Bearer valid-token" } } as Request;
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    mockVerifyIdToken.mockResolvedValue({ uid: "user-1", email: "user@desenhardigital.com.br" });
    mockDocGet.mockResolvedValue({ exists: false });

    await authMiddleware(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Usuário não cadastrado no sistema" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 503 when Firestore lookup fails", async () => {
    const req = { headers: { authorization: "Bearer valid-token" } } as Request;
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    mockVerifyIdToken.mockResolvedValue({ uid: "user-2", email: "user@desenhardigital.com.br" });
    mockDocGet.mockRejectedValue(new Error("firestore unavailable"));

    await authMiddleware(req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      message: "Serviço de autorização temporariamente indisponível",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when token and user are valid", async () => {
    const req = { headers: { authorization: "Bearer valid-token" } } as Request;
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;

    mockVerifyIdToken.mockResolvedValue({
      uid: "user-3",
      email: "user@desenhardigital.com.br",
      name: "User Test",
    });
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        statusConta: true,
        setor: "SUPORTE",
        setorNome: "Suporte",
        displayName: "User Test",
      }),
    });

    await authMiddleware(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.status).not.toHaveBeenCalledWith(503);
  });
});
