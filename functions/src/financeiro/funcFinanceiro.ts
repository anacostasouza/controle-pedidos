import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  applyStandardCors,
  applySecurityHeaders,
  createAuthenticatedRateLimiter,
  createDefaultRateLimiter,
} from "../utils/httpMiddleware";
import { authMiddleware, createSetorMiddleware } from "../utils/authMiddleware";
import { createLancamentosRouter } from "./routes/lancamentos";
import { createAuxiliaresRouter } from "./routes/auxiliares";
import { createSyncRouter } from "./routes/sync";
import { createPedidosRouter } from "./routes/pedidos";
import { syncFinanceiro } from "./financeiroSync";

export const FINANCEIRO_ALLOWED_SECTORS = [
  "FINANCEIRO",
  "GESTAO",
  "SUPORTE",
  "CAIXA",
  "VENDAS",
  "ATENDIMENTO",
] as const;

export function createFinanceiroApp(
  authentication: express.RequestHandler = authMiddleware
): express.Express {
  const app = express();
  app.set("trust proxy", 1);
  applyStandardCors(app);
  applySecurityHeaders(app);
  app.use(createDefaultRateLimiter({ max: 600 }));
  app.use(express.json());
  app.use(authentication);
  app.use(createAuthenticatedRateLimiter({ max: 250 }));
  app.use(
    createSetorMiddleware(
      FINANCEIRO_ALLOWED_SECTORS,
      "Acesso negado. Apenas colaboradores autorizados podem acessar este módulo."
    )
  );
  app.use("/financeiro", createLancamentosRouter());
  app.use("/financeiro", createAuxiliaresRouter());
  app.use("/financeiro", createSyncRouter());
  app.use("/financeiro", createPedidosRouter());
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
