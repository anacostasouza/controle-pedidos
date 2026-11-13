import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import {
  applySecurityHeaders,
  applyStandardCors,
  createAuthenticatedRateLimiter,
  createDefaultRateLimiter,
} from "../utils/httpMiddleware";
import { authMiddleware } from "../utils/authMiddleware";
import { createProtectedAtendimentoRouter, createProtectedTagPlusRouter } from "./routes/protected";
import { createPublicAtendimentoRouter } from "./routes/public";

export const appAtendimento = express();
appAtendimento.set("trust proxy", 1);

applyStandardCors(appAtendimento);
applySecurityHeaders(appAtendimento);
appAtendimento.use(createDefaultRateLimiter({ max: 600 }));
appAtendimento.use(express.json());

appAtendimento.use(createPublicAtendimentoRouter());

appAtendimento.use(authMiddleware);
appAtendimento.use(createAuthenticatedRateLimiter({ max: 250 }));

appAtendimento.use(createProtectedAtendimentoRouter());
appAtendimento.use(createProtectedTagPlusRouter());

export const atendimentoApi = onRequest(
  { region: "southamerica-east1" },
  appAtendimento
);
