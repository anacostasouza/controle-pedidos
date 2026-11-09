import express from "express";
import * as admin from "firebase-admin";
import { ensureTagPlusAccessToken } from "../../tagplus/tagplusShared";
import { logError } from "../../utils/logger";
import { FinanceiroClient } from "../FinanceiroClient";
import { getSyncMeta, syncFinanceiro } from "../financeiroSync";
import type {
  LancamentoFinanceiro,
  PagedLancamentos,
  BaixaPayload,
  CriarLancamentoPayload,
} from "../financeiroDomain";

const DB_COLLECTION = "financeiro_cache";

async function getClientWithRetry(): Promise<FinanceiroClient> {
  const storedTokens = await ensureTagPlusAccessToken();
  const accessToken =
    process.env.TAGPLUS_ACCESS_TOKEN || storedTokens?.access_token || "";
  if (!accessToken) {
    throw new Error("TAGPLUS_ACCESS_TOKEN indisponível");
  }
  return new FinanceiroClient({ accessToken });
}

async function getClientAfterRefresh(): Promise<FinanceiroClient> {
  const refreshed = await ensureTagPlusAccessToken({ forceRefresh: true });
  const accessToken =
    process.env.TAGPLUS_ACCESS_TOKEN || refreshed?.access_token || "";
  if (!accessToken) {
    throw new Error("TAGPLUS_ACCESS_TOKEN indisponível após refresh");
  }
  return new FinanceiroClient({ accessToken });
}

export function createLancamentosRouter(): express.Router {
  const router = express.Router();

  // GET /financeiro/resumo — métricas consolidadas do dashboard
  router.get("/resumo", async (req, res) => {
    try {
      const db = admin.firestore();
      const snapshot = await db.collection(DB_COLLECTION).get();
      const items: LancamentoFinanceiro[] = [];
      for (const doc of snapshot.docs) {
        items.push(doc.data() as LancamentoFinanceiro);
      }

      const todayStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const addDaysStr = (base: string, amount: number) => {
        const d = new Date(`${base}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + amount);
        return d.toISOString().slice(0, 10);
      };

      const yesterdayStr = addDaysStr(todayStr, -1);
      const d7Str = addDaysStr(todayStr, 7);
      const d15Str = addDaysStr(todayStr, 15);
      const d30Str = addDaysStr(todayStr, 30);

      const deQuery = typeof req.query.de === "string" ? req.query.de.trim() : "";
      const ateQuery = typeof req.query.ate === "string" ? req.query.ate.trim() : "";
      const diasQuery = typeof req.query.dias === "string" ? req.query.dias.trim() : "";

      let diasProjecao: number | "livre" = 7;
      let dataInicioProjecao = todayStr;
      let dataFimProjecao = d7Str;

      if (deQuery && ateQuery && /^\d{4}-\d{2}-\d{2}$/.test(deQuery) && /^\d{4}-\d{2}-\d{2}$/.test(ateQuery)) {
        diasProjecao = "livre";
        dataInicioProjecao = deQuery;
        dataFimProjecao = ateQuery;
      } else if (diasQuery === "15") {
        diasProjecao = 15;
        dataInicioProjecao = todayStr;
        dataFimProjecao = d15Str;
      } else if (diasQuery === "30") {
        diasProjecao = 30;
        dataInicioProjecao = todayStr;
        dataFimProjecao = d30Str;
      } else {
        diasProjecao = 7;
        dataInicioProjecao = todayStr;
        dataFimProjecao = d7Str;
      }

      const round = (val: number) => Math.round(val * 100) / 100;

      const calcular = (tipo: "C" | "D") => {
        let emAberto = 0;
        let vencido = 0;
        let aVencer7 = 0;
        let aVencer15 = 0;
        let aVencer30 = 0;
        let projetado = 0;
        let totalRegistros = 0;

        for (const l of items) {
          if (l.tipo !== tipo) continue;
          totalRegistros++;
          const saldo = Math.max(0, (l.valor || 0) - (l.valor_pago || 0));
          if (l.status === "aberto") {
            emAberto += saldo;
            if (l.data_vencimento < todayStr) {
              vencido += saldo;
            } else {
              if (l.data_vencimento <= d7Str) aVencer7 += saldo;
              if (l.data_vencimento <= d15Str) aVencer15 += saldo;
              if (l.data_vencimento <= d30Str) aVencer30 += saldo;
              if (l.data_vencimento >= dataInicioProjecao && l.data_vencimento <= dataFimProjecao) {
                projetado += saldo;
              }
            }
          } else if (l.status === "vencido") {
            vencido += saldo;
            emAberto += saldo;
          }
        }
        return { emAberto, vencido, aVencer7, aVencer15, aVencer30, projetado, totalRegistros };
      };

      const rec = calcular("C");
      const pag = calcular("D");

      const saldoLiquido = {
        totalEmAberto: round(rec.emAberto - pag.emAberto),
        vencido: round(rec.vencido - pag.vencido),
        projetado: round(rec.projetado - pag.projetado),
        indiceCoberturaProjetada: pag.projetado > 0 ? Number(((rec.projetado / pag.projetado) * 100).toFixed(1)) : null,
      };

      const horizontes = {
        d7: {
          receber: round(rec.aVencer7),
          pagar: round(pag.aVencer7),
          saldoLiquido: round(rec.aVencer7 - pag.aVencer7),
          indiceCobertura: pag.aVencer7 > 0 ? Number(((rec.aVencer7 / pag.aVencer7) * 100).toFixed(1)) : null,
          dataFim: d7Str,
        },
        d15: {
          receber: round(rec.aVencer15),
          pagar: round(pag.aVencer15),
          saldoLiquido: round(rec.aVencer15 - pag.aVencer15),
          indiceCobertura: pag.aVencer15 > 0 ? Number(((rec.aVencer15 / pag.aVencer15) * 100).toFixed(1)) : null,
          dataFim: d15Str,
        },
        d30: {
          receber: round(rec.aVencer30),
          pagar: round(pag.aVencer30),
          saldoLiquido: round(rec.aVencer30 - pag.aVencer30),
          indiceCobertura: pag.aVencer30 > 0 ? Number(((rec.aVencer30 / pag.aVencer30) * 100).toFixed(1)) : null,
          dataFim: d30Str,
        },
      };

      const meta = await getSyncMeta();

      if (items.length === 0 && meta.status !== "running") {
        syncFinanceiro().catch((err) =>
          logError("[financeiro] Falha ao iniciar auto-sync no resumo:", err)
        );
      }

      return res.status(200).json({
        periodo: {
          dataBase: todayStr,
          vencidosAte: yesterdayStr,
          proximos7Ate: d7Str,
          diasProjecao,
          dataInicioProjecao,
          dataFimProjecao,
        },
        receber: {
          emAberto: round(rec.emAberto),
          vencido: round(rec.vencido),
          aVencer7: round(rec.aVencer7),
          projetado: round(rec.projetado),
          totalRegistros: rec.totalRegistros,
        },
        pagar: {
          emAberto: round(pag.emAberto),
          vencido: round(pag.vencido),
          aVencer7: round(pag.aVencer7),
          projetado: round(pag.projetado),
          totalRegistros: pag.totalRegistros,
        },
        saldoLiquido,
        horizontes,
        totalGeral: items.length,
        syncedAt: meta.lastSyncAt,
        syncStatus: meta.status,
      });
    } catch (error) {
      logError("[financeiro] Erro ao calcular resumo:", error);
      return res.status(500).json({ message: "Erro ao calcular resumo financeiro" });
    }
  });

  // GET /financeiro/lancamentos — serve do Firestore cache com filtros
  router.get("/lancamentos", async (req, res) => {
    try {
      const {
        tipo,
        status,
        page: pageRaw,
        limit: limitRaw,
        data_vencimento_inicial,
        data_vencimento_final,
        q,
      } = req.query as Record<string, string | undefined>;

      const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
      const limit = Math.max(1, parseInt(limitRaw ?? "50", 10) || 50);

      const db = admin.firestore();

      // Lê todos os documentos de lançamentos da coleção de cache
      const snapshot = await db.collection(DB_COLLECTION).get();

      let items: LancamentoFinanceiro[] = [];
      for (const doc of snapshot.docs) {
        items.push(doc.data() as LancamentoFinanceiro);
      }

      // Filtros em memória
      if (tipo) {
        items = items.filter((item) => item.tipo === tipo);
      }
      if (status) {
        items = items.filter((item) => item.status === status);
      }
      if (q) {
        const termo = q.toLowerCase();
        items = items.filter((item) =>
          item.descricao?.toLowerCase().includes(termo)
        );
      }
      if (data_vencimento_inicial) {
        items = items.filter(
          (item) => item.data_vencimento >= data_vencimento_inicial
        );
      }
      if (data_vencimento_final) {
        items = items.filter(
          (item) => item.data_vencimento <= data_vencimento_final
        );
      }

      // Ordenação mais recentes primeiro (data_vencimento decrescente e id decrescente)
      items.sort((a, b) =>
        b.data_vencimento.localeCompare(a.data_vencimento) || (b.id - a.id)
      );

      // Totais gerais do conjunto filtrado
      let totalValorGeral = 0;
      let totalPendenteGeral = 0;
      for (const item of items) {
        totalValorGeral += item.valor || 0;
        totalPendenteGeral += Math.max(0, (item.valor || 0) - (item.valor_pago || 0));
      }

      // Paginação em memória
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const offset = (page - 1) * limit;
      const pageItems = items.slice(offset, offset + limit);

      // syncedAt da meta
      const meta = await getSyncMeta();

      // Se a base de cache estiver vazia e não está rodando agora
      if (items.length === 0 && meta.status !== "running") {
        syncFinanceiro().catch((err) =>
          logError("[financeiro] Falha ao iniciar auto-sync inicial:", err)
        );
      }

      const response: PagedLancamentos = {
        items: pageItems,
        total,
        page,
        totalPages,
        syncedAt: meta.lastSyncAt,
        totalValorGeral,
        totalPendenteGeral,
      };

      return res.status(200).json(response);
    } catch (error) {
      logError(
        "[financeiro] Erro ao listar lançamentos:",
        error instanceof Error ? error.message : error
      );
      return res.status(500).json({ message: "Erro ao listar lançamentos" });
    }
  });

  // GET /financeiro/lancamentos/:id — busca direto na TagPlus (sempre fresco)
  router.get("/lancamentos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const executar = async (client: FinanceiroClient) =>
        client.buscarPorId(id);

      let client: FinanceiroClient;
      try {
        client = await getClientWithRetry();
        const item = await executar(client);
        return res.status(200).json(item);
      } catch (err) {
        const retryClient = await getClientAfterRefresh();
        const item = await executar(retryClient);
        return res.status(200).json(item);
      }
    } catch (error) {
      logError(
        "[financeiro] Erro ao buscar lançamento por ID:",
        error instanceof Error ? error.message : error
      );
      return res.status(500).json({ message: "Erro ao buscar lançamento" });
    }
  });

  // POST /financeiro/lancamentos — cria novo lançamento
  router.post("/lancamentos", async (req, res) => {
    try {
      const payload = req.body as CriarLancamentoPayload;

      if (
        !payload.descricao ||
        payload.valor === undefined ||
        !payload.data_vencimento ||
        !payload.forma_pagamento_id ||
        !payload.tipo
      ) {
        return res.status(400).json({ message: "Campos obrigatórios ausentes" });
      }

      const executar = async (client: FinanceiroClient) =>
        client.criarLancamento(payload);

      let client: FinanceiroClient;
      try {
        client = await getClientWithRetry();
        const item = await executar(client);
        return res.status(201).json(item);
      } catch (err) {
        const retryClient = await getClientAfterRefresh();
        const item = await executar(retryClient);
        return res.status(201).json(item);
      }
    } catch (error) {
      logError(
        "[financeiro] Erro ao criar lançamento:",
        error instanceof Error ? error.message : error
      );
      return res.status(500).json({ message: "Erro ao criar lançamento" });
    }
  });

  // PUT /financeiro/lancamentos/:id — atualiza / dá baixa
  router.put("/lancamentos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const payload = req.body as BaixaPayload;

      const executar = async (client: FinanceiroClient) =>
        client.baixarLancamento(id, payload);

      let client: FinanceiroClient;
      try {
        client = await getClientWithRetry();
        const item = await executar(client);
        return res.status(200).json(item);
      } catch (err) {
        const retryClient = await getClientAfterRefresh();
        const item = await executar(retryClient);
        return res.status(200).json(item);
      }
    } catch (error) {
      logError(
        "[financeiro] Erro ao atualizar lançamento:",
        error instanceof Error ? error.message : error
      );
      return res.status(500).json({ message: "Erro ao atualizar lançamento" });
    }
  });

  return router;
}
