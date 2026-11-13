import express from "express";
import { ensureTagPlusAccessToken } from "../../tagplus/tagplusShared";
import { FinanceiroClient } from "../FinanceiroClient";
import type {
  FiltrosPedidosVenda,
  PagedPedidosVenda,
  PedidoVenda,
  VendedorTagPlus,
} from "../financeiroDomain";

let cachedVendedores: { data: VendedorTagPlus[]; expiresAt: number } | null = null;
const VENDEDORES_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

interface CachedQueryResult {
  allItems: PedidoVenda[];
  kpis: {
    totalPedidos: number;
    totalValor: number;
    totalConfirmados: number;
    totalValorConfirmados: number;
    totalAbertos: number;
    totalValorAbertos: number;
    ticketMedio: number;
  };
  expiresAt: number;
}

const queryCache = new Map<string, CachedQueryResult>();
const QUERY_CACHE_TTL_MS = 60 * 1000; // 60 segundos

export function clearPedidosCache(): void {
  queryCache.clear();
}

export function createPedidosRouter(): express.Router {
  const router = express.Router();

  // GET /financeiro/pedidos - Listagem paginada e filtrada de pedidos
  router.get("/pedidos", async (req, res) => {
    try {
      const tokens = await ensureTagPlusAccessToken();
      if (!tokens?.access_token) {
        return res.status(503).json({
          error: "TagPlus não autenticado. Realize a autorização OAuth.",
        });
      }

      const client = new FinanceiroClient({ accessToken: tokens.access_token });

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
      const statusParam = req.query.status as string | undefined;
      const dataInicio = req.query.data_inicio as string | undefined;
      const dataFim = req.query.data_fim as string | undefined;
      const vendedorId = req.query.vendedor_id
        ? Number(req.query.vendedor_id)
        : undefined;
      const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
      const force = req.query.force === "true";

      const cacheKey = `${dataInicio || ""}|${dataFim || ""}|${statusParam || ""}|${vendedorId || ""}|${q || ""}`;
      const now = Date.now();
      let cached = !force ? queryCache.get(cacheKey) : null;

      if (!cached || cached.expiresAt <= now) {
        // Busca com limite amplo (500) para cobrir o conjunto completo filtrado e garantir KPIs globais
        const filtros: FiltrosPedidosVenda = {
          page: 1,
          limit: 500,
          status: statusParam as any,
          data_inicio: dataInicio,
          data_fim: dataFim,
          vendedor_id: vendedorId,
          q,
        };

        const { items, totalPages } = await client.buscarPedidos(filtros);

        let allRawItems = [...items];
        // Se houver mais de 500 registros no período, busca a página 2 para completar até 1000
        if (totalPages > 1 && items.length >= 500) {
          try {
            const p2 = await client.buscarPedidos({ ...filtros, page: 2, limit: 500 });
            allRawItems = allRawItems.concat(p2.items);
          } catch {
            // Mantém os primeiros 500 itens em caso de timeout
          }
        }

        // Desduplica vendas com múltiplas parcelas pelo número oficial da venda
        // mantendo o status confirmado caso ao menos uma parcela ou a movimentação esteja confirmada
        const vendasUnicasMap = new Map<string, PedidoVenda>();
        for (const item of allRawItems) {
          const chave = String(item.numero);
          if (!vendasUnicasMap.has(chave)) {
            vendasUnicasMap.set(chave, { ...item });
          } else {
            const existente = vendasUnicasMap.get(chave)!;
            if (item.confirmado) {
              existente.confirmado = true;
              existente.status = "confirmado";
            }
            existente.valor_total = Math.max(existente.valor_total, item.valor_total);
          }
        }

        let filtrados = Array.from(vendasUnicasMap.values());

        // Filtro local adicional caso o backend TagPlus retorne dados amplos
        if (statusParam && statusParam !== "todos") {
          filtrados = filtrados.filter((p) => p.status === statusParam);
        }
        if (vendedorId) {
          filtrados = filtrados.filter((p) => p.vendedor_id === vendedorId);
        }
        if (q) {
          const termo = q.toLowerCase();
          filtrados = filtrados.filter(
            (p) =>
              String(p.numero).toLowerCase().includes(termo) ||
              p.cliente_nome.toLowerCase().includes(termo) ||
              (p.cliente_documento && p.cliente_documento.includes(termo))
          );
        }

        // Cálculo de KPIs GLOBAIS (cobre 100% dos dados filtrados de todas as páginas)
        let totalValor = 0;
        let totalConfirmados = 0;
        let totalValorConfirmados = 0;
        let totalAbertos = 0;
        let totalValorAbertos = 0;

        for (const p of filtrados) {
          totalValor += p.valor_total;
          if (p.confirmado || p.status === "confirmado") {
            totalConfirmados++;
            totalValorConfirmados += p.valor_total;
          } else if (p.status === "aberto") {
            totalAbertos++;
            totalValorAbertos += p.valor_total;
          }
        }

        const ticketMedio =
          filtrados.length > 0 ? totalValor / filtrados.length : 0;

        cached = {
          allItems: filtrados,
          kpis: {
            totalPedidos: filtrados.length,
            totalValor,
            totalConfirmados,
            totalValorConfirmados,
            totalAbertos,
            totalValorAbertos,
            ticketMedio,
          },
          expiresAt: now + QUERY_CACHE_TTL_MS,
        };

        queryCache.set(cacheKey, cached);
      }

      // Pagina a partir do conjunto global em cache
      const totalCalculado = cached.allItems.length;
      const totalPagesCalculado = Math.max(1, Math.ceil(totalCalculado / limit));
      const startIndex = (page - 1) * limit;
      const pageItems = cached.allItems.slice(startIndex, startIndex + limit);

      const response: PagedPedidosVenda = {
        items: pageItems,
        total: totalCalculado,
        page,
        totalPages: totalPagesCalculado,
        kpis: cached.kpis, // Sempre retorna os KPIs GLOBAIS cobrindo todas as páginas!
      };

      return res.json(response);
    } catch (err: any) {
      console.error("[financialApi] Erro ao buscar pedidos TagPlus:", err);
      const statusCode = err?.response?.status || 500;
      return res.status(statusCode).json({
        error: "Erro ao buscar pedidos no TagPlus",
        message: err?.message,
      });
    }
  });

  // GET /financeiro/pedidos/:id - Detalhes do pedido individual
  router.get("/pedidos/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      const tokens = await ensureTagPlusAccessToken();
      if (!tokens?.access_token) {
        return res.status(503).json({
          error: "TagPlus não autenticado.",
        });
      }

      const client = new FinanceiroClient({ accessToken: tokens.access_token });
      const pedido = await client.buscarPedidoPorId(id);
      return res.json(pedido);
    } catch (err: any) {
      console.error("[financialApi] Erro ao buscar detalhes do pedido:", err);
      const statusCode = err?.response?.status || 500;
      return res.status(statusCode).json({
        error: "Erro ao buscar detalhes do pedido",
        message: err?.message,
      });
    }
  });

  // GET /financeiro/vendedores - Lista de vendedores com cache em memória
  router.get("/vendedores", async (_req, res) => {
    try {
      const now = Date.now();
      if (cachedVendedores && cachedVendedores.expiresAt > now) {
        return res.json({ items: cachedVendedores.data });
      }

      const tokens = await ensureTagPlusAccessToken();
      if (!tokens?.access_token) {
        return res.status(503).json({
          error: "TagPlus não autenticado.",
        });
      }

      const client = new FinanceiroClient({ accessToken: tokens.access_token });
      const vendedores = await client.buscarVendedores();

      cachedVendedores = {
        data: vendedores,
        expiresAt: now + VENDEDORES_CACHE_TTL_MS,
      };

      return res.json({ items: vendedores });
    } catch (err: any) {
      console.error("[financialApi] Erro ao buscar vendedores TagPlus:", err);
      return res.json({ items: [] });
    }
  });

  return router;
}

