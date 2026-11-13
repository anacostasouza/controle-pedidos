import request from "supertest";

const store = new Map<string, Record<string, unknown>>();
const mockCollectionGetCounts = new Map<string, number>();

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

class MockDoc {
  constructor(public path: string) {}
  get id() {
    return this.path.split("/").pop()!;
  }
  async get() {
    const data = store.get(this.path);
    return {
      id: this.id,
      exists: Boolean(data),
      data: () => (data ? clone(data) : undefined),
    };
  }
  async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
    if (options?.merge && store.has(this.path)) {
      store.set(this.path, { ...store.get(this.path), ...clone(data) });
    } else {
      store.set(this.path, clone(data));
    }
  }
  async update(data: Record<string, unknown>) {
    const prev = store.get(this.path) || {};
    store.set(this.path, { ...prev, ...clone(data) });
  }
  async delete() {
    store.delete(this.path);
  }
}

class MockCollection {
  constructor(private readonly name: string) {}
  doc(id: string) {
    return new MockDoc(`${this.name}/${id}`);
  }
  where() {
    return this;
  }
  orderBy() {
    return this;
  }
  limit() {
    return this;
  }
  async add(data: Record<string, unknown>) {
    const id = `doc-${store.size + 1}`;
    store.set(`${this.name}/${id}`, clone(data));
    return { id };
  }
  async get() {
    mockCollectionGetCounts.set(
      this.name,
      (mockCollectionGetCounts.get(this.name) || 0) + 1
    );
    const docs = [...store.entries()]
      .filter(([key]) => key.startsWith(`${this.name}/`))
      .map(([key, value]) => ({
        id: key.split("/").pop()!,
        data: () => clone(value),
      }));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

const mockVerifyIdToken = jest.fn();
const mockExchangeTagPlusCodeForToken = jest.fn();
const mockEnsureTagPlusAccessToken = jest.fn();
const mockSaveStoredTagPlusTokens = jest.fn();

jest.mock("firebase-admin", () => ({
  auth: () => ({
    verifyIdToken: mockVerifyIdToken,
    getUser: jest.fn(),
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
    deleteUser: jest.fn(),
  }),
  firestore: () => ({
    collection: (name: string) => new MockCollection(name),
    runTransaction: async (fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        get: (ref: MockDoc) => ref.get(),
        set: (ref: MockDoc, data: Record<string, unknown>) => ref.set(data),
        delete: (ref: MockDoc) => ref.delete(),
      };
      return fn(tx);
    },
  }),
}));

jest.mock("../../tagplus/tagplusShared", () => ({
  exchangeTagPlusCodeForToken: mockExchangeTagPlusCodeForToken,
  ensureTagPlusAccessToken: mockEnsureTagPlusAccessToken,
  saveStoredTagPlusTokens: mockSaveStoredTagPlusTokens,
  refreshTagPlusAccessToken: jest.fn(),
}));

import { createTagPlusApp } from "../../tagplus/funcTagPlus";
import { createFinanceiroApp } from "../../financeiro/funcFinanceiro";
import { invalidateFinanceiroMemoryCache } from "../../financeiro/financeiroSync";
import { appAtendimento } from "../../atendimento/funcAtendimento";
import { appUsuarios } from "../../usuarios/funcUsuarios";
import { invalidateUserAuthCache } from "../../utils/authMiddleware";

const appTagPlus = createTagPlusApp();
const appFinanceiro = createFinanceiroApp();

describe("Security & Optimization Hardening", () => {
  const prevClientId = process.env.TAGPLUS_CLIENT_ID;
  const prevClientSecret = process.env.TAGPLUS_CLIENT_SECRET;
  const prevFinCacheTtl = process.env.FINANCEIRO_MEMORY_CACHE_TTL_MS;

  beforeEach(() => {
    jest.clearAllMocks();
    store.clear();
    mockCollectionGetCounts.clear();
    invalidateUserAuthCache();
    invalidateFinanceiroMemoryCache();
    delete process.env.FINANCEIRO_MEMORY_CACHE_TTL_MS;

    process.env.TAGPLUS_CLIENT_ID = "tagplus-client-id";
    process.env.TAGPLUS_CLIENT_SECRET = "tagplus-client-secret";

    store.set("usuarios/admin-1", {
      displayName: "Admin",
      setor: "SUPORTE",
      setorNome: "Suporte",
      statusConta: true,
    });
    store.set("usuarios/balcao-1", {
      displayName: "Atendente Balcão",
      setor: "BALCAO",
      setorNome: "Balcão",
      statusConta: true,
    });
    store.set("usuarios/rh-1", {
      displayName: "Analista RH",
      setor: "RH",
      setorNome: "RH",
      statusConta: true,
    });
    store.set("usuarios/fin-1", {
      displayName: "Analista Financeiro",
      setor: "FINANCEIRO",
      setorNome: "Financeiro",
      statusConta: true,
    });

    mockVerifyIdToken.mockImplementation(async (token: string) => {
      if (token === "admin-token") {
        return { uid: "admin-1", email: "admin@desenhardigital.com.br", name: "Admin" };
      }
      if (token === "balcao-token") {
        return { uid: "balcao-1", email: "balcao@desenhardigital.com.br", name: "Balcão" };
      }
      if (token === "rh-token") {
        return { uid: "rh-1", email: "rh@desenhardigital.com.br", name: "RH" };
      }
      if (token === "fin-token") {
        return { uid: "fin-1", email: "fin@desenhardigital.com.br", name: "Financeiro" };
      }
      throw new Error("Invalid token");
    });

    mockEnsureTagPlusAccessToken.mockResolvedValue({
      access_token: "secret-access-token",
      refresh_token: "secret-refresh-token",
      saved_at: "2026-11-10T12:00:00Z",
    });

    mockExchangeTagPlusCodeForToken.mockResolvedValue({
      access_token: "new-secret-access-token",
      refresh_token: "new-secret-refresh-token",
      expires_in: 3600,
    });
  });

  afterAll(() => {
    if (prevClientId === undefined) delete process.env.TAGPLUS_CLIENT_ID;
    else process.env.TAGPLUS_CLIENT_ID = prevClientId;
    if (prevClientSecret === undefined) delete process.env.TAGPLUS_CLIENT_SECRET;
    else process.env.TAGPLUS_CLIENT_SECRET = prevClientSecret;
    if (prevFinCacheTtl === undefined) delete process.env.FINANCEIRO_MEMORY_CACHE_TTL_MS;
    else process.env.FINANCEIRO_MEMORY_CACHE_TTL_MS = prevFinCacheTtl;
  });

  describe("TagPlus OAuth Hardening", () => {
    it("exige autenticação e perfil administrativo em /auth/status e /auth/start", async () => {
      const noAuth = await request(appTagPlus).get("/auth/status");
      expect(noAuth.status).toBe(401);

      const nonAdmin = await request(appTagPlus)
        .get("/auth/status")
        .set("Authorization", "Bearer balcao-token");
      expect(nonAdmin.status).toBe(403);

      const adminStatus = await request(appTagPlus)
        .get("/auth/status")
        .set("Authorization", "Bearer admin-token");
      expect(adminStatus.status).toBe(200);
      expect(adminStatus.body.hasStoredToken).toBe(true);
    });

    it("valida CSRF state de uso único no callback e não expõe access_token/refresh_token", async () => {
      const startRes = await request(appTagPlus)
        .get("/auth/start?format=json")
        .set("Authorization", "Bearer admin-token");

      expect(startRes.status).toBe(200);
      const authorizeUrl = new URL(startRes.body.authorizeUrl);
      const state = authorizeUrl.searchParams.get("state");
      expect(state).toMatch(/^[a-f0-9]{64}$/i);

      const badStateRes = await request(appTagPlus).get(
        "/oauth/tagplus/callback?code=abc&state=forged-state"
      );
      expect(badStateRes.status).toBe(403);

      const callbackRes = await request(appTagPlus).get(
        `/oauth/tagplus/callback?code=valid-code&state=${state}`
      );
      expect(callbackRes.status).toBe(200);
      expect(callbackRes.body.ok).toBe(true);
      expect(JSON.stringify(callbackRes.body)).not.toContain("new-secret-access-token");
      expect(JSON.stringify(callbackRes.body)).not.toContain("new-secret-refresh-token");

      const replayRes = await request(appTagPlus).get(
        `/oauth/tagplus/callback?code=valid-code&state=${state}`
      );
      expect(replayRes.status).toBe(403);
    });
  });

  describe("Financeiro Security & Cache", () => {
    it("bloqueia setores não financeiros com 403 e remove GET /financeiro/sync/now", async () => {
      const denied = await request(appFinanceiro)
        .get("/financeiro/resumo")
        .set("Authorization", "Bearer balcao-token");
      expect(denied.status).toBe(403);

      const syncNow = await request(appFinanceiro)
        .get("/financeiro/sync/now")
        .set("Authorization", "Bearer fin-token");
      expect(syncNow.status).toBe(404);
    });

    it("reutiliza cache em memória de financeiro_cache em consultas repetidas de resumo", async () => {
      process.env.FINANCEIRO_MEMORY_CACHE_TTL_MS = "10000";
      store.set("financeiro_cache/1", {
        id: 1,
        tipo: "C",
        status: "aberto",
        valor: 100,
        valor_pago: 0,
        data_vencimento: "2026-11-15",
      });

      const r1 = await request(appFinanceiro)
        .get("/financeiro/resumo")
        .set("Authorization", "Bearer fin-token");
      const r2 = await request(appFinanceiro)
        .get("/financeiro/resumo")
        .set("Authorization", "Bearer fin-token");

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);
      expect(mockCollectionGetCounts.get("financeiro_cache")).toBe(1);
    });
  });

  describe("Atendimento & Usuários Hardening", () => {
    it("valida sessão em /auth/verify sem ler coleção atendimentos", async () => {
      const res = await request(appAtendimento)
        .get("/auth/verify")
        .set("Authorization", "Bearer balcao-token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        authorized: true,
        uid: "balcao-1",
        setor: "BALCAO",
      });
      expect(mockCollectionGetCounts.get("atendimentos")).toBeUndefined();
    });

    it("exige autenticação em /registrarAtendimento e valida entrada em /criarAtendimentoFila", async () => {
      const publicDirect = await request(appAtendimento)
        .post("/registrarAtendimento")
        .send({ nomeCliente: "Teste", tipoAtendimento: "Plotagem" });
      expect(publicDirect.status).toBe(401);

      const invalidQueue = await request(appAtendimento)
        .post("/criarAtendimentoFila")
        .send({
          nomeCliente: "Teste",
          tipoAtendimento: "Plotagem",
          prioridade: "invalida",
        });
      expect(invalidQueue.status).toBe(400);

      const validQueue = await request(appAtendimento)
        .post("/criarAtendimentoFila")
        .send({
          nomeCliente: "Cliente Fila",
          tipoAtendimento: "Impressão",
          prioridade: "preferencial",
          extraMalicioso: "nao-salvar",
        });
      expect(validQueue.status).toBe(201);
      const saved = store.get(`atendimentos/${validQueue.body.atendimentoId}`);
      expect(saved).toBeDefined();
      expect(saved?.extraMalicioso).toBeUndefined();
    });

    it("restringe DELETE /deletarAtendimento/:id por setor", async () => {
      store.set("atendimentos/at-1", { nomeCliente: "Cliente" });

      const denied = await request(appAtendimento)
        .delete("/deletarAtendimento/at-1")
        .set("Authorization", "Bearer rh-token")
        .send({ justificativa: "Teste" });
      expect(denied.status).toBe(403);

      const allowed = await request(appAtendimento)
        .delete("/deletarAtendimento/at-1")
        .set("Authorization", "Bearer balcao-token")
        .send({ justificativa: "Cancelamento solicitado" });
      expect(allowed.status).toBe(200);
      expect(store.has("atendimentos/at-1")).toBe(false);
    });

    it("valida enum de setor em PATCH /usuarios/:uid", async () => {
      const invalid = await request(appUsuarios)
        .patch("/usuarios/balcao-1")
        .set("Authorization", "Bearer admin-token")
        .send({ setor: "SETOR_INEXISTENTE" });
      expect(invalid.status).toBe(400);
    });
  });
});

