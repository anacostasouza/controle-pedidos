import * as admin from "firebase-admin";
import express from "express";
import rateLimit from "express-rate-limit";
import { Timestamp } from "firebase-admin/firestore";
import { getRequestIp } from "../../utils/httpMiddleware";
import { logError } from "../../utils/logger";

const ALLOWED_PRIORIDADES = new Set([
  "convencional",
  "preferencial",
  "normal",
  "alta",
]);

function normalizeRequiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

export function createPublicAtendimentoRouter(): express.Router {
  const router = express.Router();
  const publicLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getRequestIp(req),
  });

  router.post("/criarAtendimentoFila", publicLimiter, async (req, res) => {
    try {
      const nomeCliente = normalizeRequiredText(req.body?.nomeCliente, 120);
      const tipoAtendimento = normalizeRequiredText(req.body?.tipoAtendimento, 100);

      if (!nomeCliente || !tipoAtendimento) {
        res
          .status(400)
          .send("Nome do cliente e tipo de atendimento válidos são obrigatórios.");
        return;
      }

      const rawPrioridade = req.body?.prioridade;
      let prioridade = "convencional";
      if (rawPrioridade !== undefined && rawPrioridade !== null && rawPrioridade !== "") {
        if (typeof rawPrioridade !== "string" || !ALLOWED_PRIORIDADES.has(rawPrioridade.trim().toLowerCase())) {
          res.status(400).send("Prioridade inválida.");
          return;
        }
        prioridade = rawPrioridade.trim().toLowerCase() === "preferencial" ||
          rawPrioridade.trim().toLowerCase() === "alta"
          ? "preferencial"
          : "convencional";
      }

      const docRef = await admin
        .firestore()
        .collection("atendimentos")
        .add({
          nomeCliente,
          tipoAtendimento,
          prioridade,
          status: "Aguardando",
          criadoEm: Timestamp.now(),
        });

      res.status(201).send({ atendimentoId: docRef.id });
    } catch (error) {
      logError(
        "Erro ao criar atendimento na fila:",
        error instanceof Error ? error.message : "Erro desconhecido"
      );
      res.status(500).send("Erro interno ao criar atendimento na fila.");
    }
  });

  return router;
}
