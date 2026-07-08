import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import {
  applySecurityHeaders,
  applyStandardCors,
  createDefaultRateLimiter,
} from "../utils/httpMiddleware";
import { authMiddleware } from "../utils/authMiddleware";
import { createProtectedAtendimentoRouter, createProtectedTagPlusRouter } from "./routes/protected";
import { createPublicAtendimentoRouter } from "./routes/public";

export const appAtendimento = express();

applyStandardCors(appAtendimento);
applySecurityHeaders(appAtendimento);
appAtendimento.use(createDefaultRateLimiter());
appAtendimento.use(express.json());

appAtendimento.use(createPublicAtendimentoRouter());

appAtendimento.use(authMiddleware);

appAtendimento.use(createProtectedAtendimentoRouter());
appAtendimento.use(createProtectedTagPlusRouter());

export const atendimentoApi = onRequest(
  { region: "southamerica-east1" },
  appAtendimento
);
