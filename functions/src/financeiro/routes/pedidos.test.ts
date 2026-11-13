import request from "supertest";
import express from "express";
import { createPedidosRouter, clearPedidosCache } from "./pedidos";
import * as tagplusShared from "../../tagplus/tagplusShared";
import { FinanceiroClient } from "../FinanceiroClient";

jest.mock("../../tagplus/tagplusShared");
jest.mock("../FinanceiroClient");

describe("Rotas de Pedidos (/pedidos)", () => {
  let app: express.Express;
  const mockBuscarPedidos = jest.fn();
  const mockBuscarPedidoPorId = jest.fn();
  const mockBuscarVendedores = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearPedidosCache();
    (tagplusShared.ensureTagPlusAccessToken as jest.Mock).mockResolvedValue({
      access_token: "test-token",
    });

    (FinanceiroClient as jest.Mock).mockImplementation(() => ({
      buscarPedidos: mockBuscarPedidos,
      buscarPedidoPorId: mockBuscarPedidoPorId,
      buscarVendedores: mockBuscarVendedores,
    }));

    app = express();
    app.use(express.json());
    app.use("/financeiro", createPedidosRouter());
  });

  it("deve retornar 503 se o token TagPlus não estiver disponível", async () => {
    (tagplusShared.ensureTagPlusAccessToken as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get("/financeiro/pedidos");
    expect(res.status).toBe(503);
    expect(res.body.error).toContain("TagPlus não autenticado");
  });

  it("deve listar pedidos calculando KPIs corretamente", async () => {
    mockBuscarPedidos.mockResolvedValue({
      items: [
        {
          id: 101,
          numero: "101",
          status: "confirmado",
          confirmado: true,
          valor_total: 500,
          cliente_nome: "Cliente Alpha",
          vendedor_id: 1,
        },
        {
          id: 102,
          numero: "102",
          status: "aberto",
          confirmado: false,
          valor_total: 300,
          cliente_nome: "Cliente Beta",
          vendedor_id: 2,
        },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    });

    const res = await request(app).get("/financeiro/pedidos");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.kpis.totalPedidos).toBe(2);
    expect(res.body.kpis.totalValor).toBe(800);
    expect(res.body.kpis.totalConfirmados).toBe(1);
    expect(res.body.kpis.totalValorConfirmados).toBe(500);
    expect(res.body.kpis.totalAbertos).toBe(1);
    expect(res.body.kpis.totalValorAbertos).toBe(300);
    expect(res.body.kpis.ticketMedio).toBe(400);
  });

  it("deve aplicar filtro local por status", async () => {
    mockBuscarPedidos.mockResolvedValue({
      items: [
        { id: 1, numero: "1", status: "confirmado", confirmado: true, valor_total: 100, cliente_nome: "A" },
        { id: 2, numero: "2", status: "aberto", confirmado: false, valor_total: 200, cliente_nome: "B" },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    });

    const res = await request(app).get("/financeiro/pedidos?status=confirmado");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(1);
    expect(res.body.kpis.totalPedidos).toBe(1);
    expect(res.body.kpis.totalValor).toBe(100);
  });

  it("deve manter os KPIs globais de todas as páginas ao navegar para a página 2", async () => {
    // Simula 3 itens totais com limit=2 (gerando 2 páginas)
    mockBuscarPedidos.mockResolvedValue({
      items: [
        { id: 1, numero: "320001", status: "confirmado", confirmado: true, valor_total: 100, cliente_nome: "A" },
        { id: 2, numero: "320002", status: "confirmado", confirmado: true, valor_total: 200, cliente_nome: "B" },
        { id: 3, numero: "320003", status: "aberto", confirmado: false, valor_total: 300, cliente_nome: "C" },
      ],
      total: 3,
      page: 1,
      totalPages: 1,
    });

    // Requisição na página 2 com limit=2
    const res = await request(app).get("/financeiro/pedidos?page=2&limit=2");
    expect(res.status).toBe(200);
    // Na página 2, só deve vir o 3º item
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(3);
    expect(res.body.page).toBe(2);
    expect(res.body.totalPages).toBe(2);
    expect(res.body.total).toBe(3);

    // MAS os KPIs devem continuar refletindo TODAS as 3 vendas do conjunto (R$ 600, 2 confirmadas, 1 aberta)!
    expect(res.body.kpis.totalPedidos).toBe(3);
    expect(res.body.kpis.totalValor).toBe(600);
    expect(res.body.kpis.totalConfirmados).toBe(2);
    expect(res.body.kpis.totalValorConfirmados).toBe(300);
    expect(res.body.kpis.totalAbertos).toBe(1);
    expect(res.body.kpis.totalValorAbertos).toBe(300);
    expect(res.body.kpis.ticketMedio).toBe(200);
  });

  it("deve buscar pedido por id", async () => {
    mockBuscarPedidoPorId.mockResolvedValue({
      id: 55,
      numero: "55",
      cliente_nome: "Empresa XPTO",
      valor_total: 1500,
      itens: [{ id: 1, descricao: "Banner Lona", quantidade: 2, valor_total: 300 }],
    });

    const res = await request(app).get("/financeiro/pedidos/55");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(55);
    expect(res.body.itens).toHaveLength(1);
  });

  it("deve retornar 400 para id inválido", async () => {
    const res = await request(app).get("/financeiro/pedidos/abc");
    expect(res.status).toBe(400);
  });

  it("deve listar vendedores", async () => {
    mockBuscarVendedores.mockResolvedValue([
      { id: 1, nome: "João Vendedor", email: "joao@desenhardigital.com.br", ativo: true },
      { id: 2, nome: "Maria Vendedora", email: "maria@desenhardigital.com.br", ativo: true },
    ]);

    const res = await request(app).get("/financeiro/vendedores");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].nome).toBe("João Vendedor");
  });
});

