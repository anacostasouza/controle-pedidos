import crypto from "crypto";
import express from "express";
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { authMiddleware, createSetorMiddleware } from "../utils/authMiddleware";
import {
  applyStandardCors,
  applySecurityHeaders,
  createAuthenticatedRateLimiter,
  createDefaultRateLimiter,
} from "../utils/httpMiddleware";
import { logError, logSecurityEvent } from "../utils/logger";
import {
  exchangeTagPlusCodeForToken,
  ensureTagPlusAccessToken,
  saveStoredTagPlusTokens,
} from "./tagplusShared";

const OAUTH_STATES_COLLECTION = "tagplus_oauth_states";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const TAGPLUS_ADMIN_SECTORS = ["SUPORTE", "GESTAO"] as const;

export function createTagPlusApp(
  authentication: express.RequestHandler = authMiddleware
): express.Express {
  const app = express();
  app.set("trust proxy", 1);

  applyStandardCors(app);
  applySecurityHeaders(app);
  app.use(createDefaultRateLimiter({ max: 120 }));
  app.use(express.json());

  const requireAdmin = createSetorMiddleware(
    TAGPLUS_ADMIN_SECTORS,
    "Acesso negado. Apenas Gestão ou Suporte pode gerenciar a integração TagPlus."
  );
  const authRateLimiter = createAuthenticatedRateLimiter({ max: 120 });

  app.get("/auth/status", authentication, authRateLimiter, requireAdmin, async (_req, res) => {
    const storedTokens = await ensureTagPlusAccessToken();
    return res.json({
      ok: true,
      hasProcessToken: Boolean(process.env.TAGPLUS_ACCESS_TOKEN),
      hasStoredToken: Boolean(storedTokens?.access_token),
      savedAt: storedTokens?.saved_at || null,
    });
  });

  // Inicia o fluxo de autorização (gera state CSRF de uso único e redireciona para o TagPlus)
  app.get("/auth/start", authentication, authRateLimiter, requireAdmin, async (req, res) => {
    const clientId = process.env.TAGPLUS_CLIENT_ID;
    const defaultScopes = [
      "read:clientes",
      "read:pedidos",
      "read:financeiros",
      "write:financeiros",
      "read:contas",
      "read:formas_pagamento",
      "read:planos_orcamentarios",
      "read:fornecedores",
      "read:vendas_simples",
      "read:movimentacoes",
      "read:produtos",
    ].join(" ");
    const scope = (process.env.TAGPLUS_SCOPE as string) || defaultScopes;
    if (!clientId) {
      return res.status(500).json({ message: "TAGPLUS_CLIENT_ID not configured" });
    }

    const state = crypto.randomBytes(32).toString("hex");
    const now = Date.now();
    const uid = (req as express.Request & { user?: { uid?: string } }).user?.uid || "unknown";

    await admin
      .firestore()
      .collection(OAUTH_STATES_COLLECTION)
      .doc(state)
      .set({
        uid,
        createdAt: now,
        expiresAt: now + OAUTH_STATE_TTL_MS,
      });

    const redirectUri = (process.env.TAGPLUS_REDIRECT_URI as string) || "";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope,
      state,
    });

    if (redirectUri) params.set("redirect_uri", redirectUri);

    const authorizeUrl = `https://developers.tagplus.com.br/authorize?${params.toString()}`;
    const wantsJson =
      req.query.format === "json" ||
      (typeof req.headers.accept === "string" &&
        req.headers.accept.includes("application/json") &&
        !req.headers.accept.includes("text/html"));

    if (wantsJson) {
      return res.status(200).json({ authorizeUrl });
    }

    return res.redirect(authorizeUrl);
  });

  // Callback que TagPlus irá chamar com ?code=...&state=... após autorização
  app.get("/oauth/tagplus/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code.trim() : "";
    const state = typeof req.query.state === "string" ? req.query.state.trim() : "";
    const error = typeof req.query.error === "string" ? req.query.error.trim() : "";

    if (error) {
      return res.status(400).json({ ok: false, message: "Autorização recusada pelo TagPlus." });
    }

    if (!code) {
      return res.status(400).json({ ok: false, message: "Missing code" });
    }

    if (!/^[a-f0-9]{64}$/i.test(state)) {
      logSecurityEvent("tagplus.oauth.invalid_state");
      return res.status(403).json({ ok: false, message: "Parâmetro state inválido ou ausente." });
    }

    const clientId = process.env.TAGPLUS_CLIENT_ID;
    const clientSecret = process.env.TAGPLUS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ message: "TAGPLUS_CLIENT_ID or TAGPLUS_CLIENT_SECRET not configured" });
    }

    try {
      const db = admin.firestore();
      const stateRef = db.collection(OAUTH_STATES_COLLECTION).doc(state);
      const validState = await db.runTransaction(async (tx) => {
        const snap = await tx.get(stateRef);
        if (!snap.exists) {
          return false;
        }
        const data = snap.data() as { expiresAt?: number } | undefined;
        tx.delete(stateRef);
        return typeof data?.expiresAt === "number" && data.expiresAt > Date.now();
      });

      if (!validState) {
        logSecurityEvent("tagplus.oauth.expired_or_replayed_state");
        return res.status(403).json({ ok: false, message: "Sessão OAuth expirada ou inválida." });
      }

      const tokenData = await exchangeTagPlusCodeForToken(code, clientId, clientSecret);

      if (tokenData.access_token) process.env.TAGPLUS_ACCESS_TOKEN = tokenData.access_token;
      if (tokenData.refresh_token) process.env.TAGPLUS_REFRESH_TOKEN = tokenData.refresh_token;
      await saveStoredTagPlusTokens(tokenData);

      return res.status(200).json({
        ok: true,
        message: "Autorização TagPlus concluída com sucesso.",
      });
    } catch (err: any) {
      logError("Error exchanging code for token:", err?.response?.data || err?.message || err);
      return res.status(500).json({
        ok: false,
        message: "Erro ao concluir autorização com a API TagPlus.",
      });
    }
  });

  return app;
}

export const appTagPlus = createTagPlusApp();

export const apiTagPlus = onRequest(
  {
    region: "southamerica-east1",
  },
  appTagPlus
);
