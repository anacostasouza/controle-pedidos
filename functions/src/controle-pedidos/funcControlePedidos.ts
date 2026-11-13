import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import {
  applySecurityHeaders,
  applyStandardCors,
  createAuthenticatedRateLimiter,
  createDefaultRateLimiter,
} from "../utils/httpMiddleware";
import { authMiddleware } from "../utils/authMiddleware";
import {
  createProtectedDashboardRouter,
  createProtectedOmieRouter,
  createProtectedTagPlusRouter,
} from "./routes/protected";

export const appControlePedidos = express();
appControlePedidos.set("trust proxy", 1);

applyStandardCors(appControlePedidos);
applySecurityHeaders(appControlePedidos);
appControlePedidos.use(createDefaultRateLimiter({ max: 600 }));
appControlePedidos.use(express.json());

appControlePedidos.use(authMiddleware);
appControlePedidos.use(createAuthenticatedRateLimiter({ max: 250 }));
appControlePedidos.use(createProtectedDashboardRouter());
appControlePedidos.use(createProtectedOmieRouter());
appControlePedidos.use(createProtectedTagPlusRouter());

export const controlePedidosApi = onRequest(
  {
    region: "southamerica-east1",
  },
  appControlePedidos
);
