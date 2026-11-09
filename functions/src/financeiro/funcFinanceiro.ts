import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  applyStandardCors,
  applySecurityHeaders,
  createDefaultRateLimiter,
} from "../utils/httpMiddleware";
import { authMiddleware } from "../utils/authMiddleware";
import { createLancamentosRouter } from "./routes/lancamentos";
import { createAuxiliaresRouter } from "./routes/auxiliares";
import { createSyncRouter } from "./routes/sync";
import { syncFinanceiro } from "./financeiroSync";

export function createFinanceiroApp(
  authentication: express.RequestHandler = authMiddleware
): express.Express {
  const app = express();
  applyStandardCors(app);
  applySecurityHeaders(app);
  app.use(createDefaultRateLimiter());
  app.use(express.json());
  app.use(authentication);
  app.use("/financeiro", createLancamentosRouter());
  app.use("/financeiro", createAuxiliaresRouter());
  app.use("/financeiro", createSyncRouter());
  return app;
}

export const financialApi = onRequest(
  { region: "southamerica-east1", timeoutSeconds: 60 },
  createFinanceiroApp()
);

export const financialSyncScheduled = onSchedule(
  {
    region: "southamerica-east1",
    schedule: "every 15 minutes",
    timeZone: "America/Sao_Paulo",
    timeoutSeconds: 540,
    retryCount: 3,
  },
  async () => {
    await syncFinanceiro();
  }
);
