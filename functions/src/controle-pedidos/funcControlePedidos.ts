import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import {
  applySecurityHeaders,
  applyStandardCors,
  createDefaultRateLimiter,
} from "../utils/httpMiddleware";
import { authMiddleware } from "../utils/authMiddleware";
import {
  createProtectedDashboardRouter,
  createProtectedOmieRouter,
  createProtectedTagPlusRouter,
} from "./routes/protected";

export const appControlePedidos = express();

applyStandardCors(appControlePedidos);
applySecurityHeaders(appControlePedidos);
appControlePedidos.use(createDefaultRateLimiter());
appControlePedidos.use(express.json());

appControlePedidos.use(authMiddleware);
appControlePedidos.use(createProtectedDashboardRouter());
appControlePedidos.use(createProtectedOmieRouter());
appControlePedidos.use(createProtectedTagPlusRouter());

export const controlePedidosApi = onRequest(
  {
    region: "southamerica-east1",
  },
  appControlePedidos
);
