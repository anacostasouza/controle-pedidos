import express from "express";
import { logError } from "../../utils/logger";
import { syncFinanceiro, getSyncMeta } from "../financeiroSync";

export function createSyncRouter(): express.Router {
  const router = express.Router();

  // POST /financeiro/sync — dispara syncFinanceiro() em background, responde imediatamente
  router.post("/sync", (req, res) => {
    const force = Boolean(req.body?.force);
    syncFinanceiro(force).catch((error: unknown) => {
      logError(
        "[financeiro] Erro no sync em background:",
        error instanceof Error ? error.message : error
      );
    });

    return res
      .status(202)
      .json({ message: "Sincronização iniciada em background" });
  });

  // GET /financeiro/sync/status — retorna getSyncMeta()
  router.get("/sync/status", async (req, res) => {
    try {
      const meta = await getSyncMeta();
      return res.status(200).json(meta);
    } catch (error) {
      logError(
        "[financeiro] Erro ao obter status do sync:",
        error instanceof Error ? error.message : error
      );
      return res.status(500).json({ message: "Erro ao obter status do sync" });
    }
  });

  return router;
}
