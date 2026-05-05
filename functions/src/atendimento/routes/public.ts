import * as admin from "firebase-admin";
import express from "express";
import rateLimit from "express-rate-limit";
import { Timestamp } from "firebase-admin/firestore";
import { logError } from "../../utils/logger";

export function createPublicAtendimentoRouter(): express.Router {
  const router = express.Router();
  const publicLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post("/criarAtendimentoFila", publicLimiter, async (req, res) => {
    try {
      const atendimentoData = req.body;

      if (!atendimentoData.nomeCliente || !atendimentoData.tipoAtendimento) {
        res
          .status(400)
          .send("Nome do cliente e tipo de atendimento são obrigatórios.");
        return;
      }

      const docRef = await admin
        .firestore()
        .collection("atendimentos")
        .add({
          ...atendimentoData,
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
