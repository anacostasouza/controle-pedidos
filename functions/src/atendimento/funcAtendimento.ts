import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import {
  applySecurityHeaders,
  applyStandardCors,
  createDefaultRateLimiter,
} from "../utils/httpMiddleware";
import { authMiddleware } from "../utils/authMiddleware";
import { createProtectedAtendimentoRouter } from "./routes/protected";
import { createPublicAtendimentoRouter } from "./routes/public";

const app = express();

applyStandardCors(app);
applySecurityHeaders(app);
app.use(createDefaultRateLimiter());
app.use(express.json());

app.use(createPublicAtendimentoRouter());

app.use(authMiddleware);

app.use(createProtectedAtendimentoRouter());

export const atendimentoApi = onRequest(
  { region: "southamerica-east1" },
  app
);
