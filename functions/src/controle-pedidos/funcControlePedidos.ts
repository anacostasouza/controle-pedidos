import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import {
  applySecurityHeaders,
  applyStandardCors,
  createDefaultRateLimiter,
} from "../utils/httpMiddleware";
import { authMiddleware } from "../utils/authMiddleware";
import { createPublicWebhookRouter } from "./routes/public";
import {
  createProtectedDashboardRouter,
  createProtectedOmieRouter,
} from "./routes/protected";

const app = express();

applyStandardCors(app);
applySecurityHeaders(app);
app.use(createDefaultRateLimiter());
app.use(express.json());

app.use(createPublicWebhookRouter());

app.use(authMiddleware);
app.use(createProtectedDashboardRouter());
app.use(createProtectedOmieRouter());

export const apiControlePedidos = onRequest(
  {
    region: "southamerica-east1",
  },
  app
);
