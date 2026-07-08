import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import {
  applyStandardCors,
  applySecurityHeaders,
  createDefaultRateLimiter,
} from "../utils/httpMiddleware";
import { TagPlusClient } from "./TagPlusClient";
import {
  exchangeTagPlusCodeForToken,
  ensureTagPlusAccessToken,
  refreshTagPlusAccessToken,
  saveStoredTagPlusTokens,
} from "./tagplusShared";

export const appTagPlus = express();

applyStandardCors(appTagPlus);
applySecurityHeaders(appTagPlus);
appTagPlus.use(createDefaultRateLimiter());
appTagPlus.use(express.json());

appTagPlus.get("/auth/status", async (_req, res) => {
  const storedTokens = await ensureTagPlusAccessToken();
  return res.json({
    ok: true,
    hasProcessToken: Boolean(process.env.TAGPLUS_ACCESS_TOKEN),
    hasStoredToken: Boolean(storedTokens?.access_token),
    savedAt: storedTokens?.saved_at || null,
  });
});

// Inicia o fluxo de autorização (redireciona o usuário para a tela de autorização TagPlus)
appTagPlus.get("/auth/start", (req, res) => {
  const clientId = process.env.TAGPLUS_CLIENT_ID;
  const scope = (process.env.TAGPLUS_SCOPE as string) || "read:clientes read:pedidos";
  if (!clientId) {
    return res.status(500).json({ message: "TAGPLUS_CLIENT_ID not configured" });
  }

  const redirectUri = (process.env.TAGPLUS_REDIRECT_URI as string) || "";
  const state = req.query.state || "";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scope,
    state: String(state),
  });

  // TagPlus ignore redirect_uri in some flows; include if provided
  if (redirectUri) params.set("redirect_uri", redirectUri);

  const authorizeUrl = `https://developers.tagplus.com.br/authorize?${params.toString()}`;
  return res.redirect(authorizeUrl);
});

// Callback que TagPlus irá chamar com ?code=... após autorização
appTagPlus.get("/oauth/tagplus/callback", async (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;

  if (error) {
    return res.status(400).json({ ok: false, error });
  }

  if (!code) {
    return res.status(400).json({ ok: false, message: "Missing code" });
  }

  const clientId = process.env.TAGPLUS_CLIENT_ID;
  const clientSecret = process.env.TAGPLUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ message: "TAGPLUS_CLIENT_ID or TAGPLUS_CLIENT_SECRET not configured" });
  }

  try {
    const tokenData = await exchangeTagPlusCodeForToken(code, clientId, clientSecret);

    // Para testes locais, armazenamos em variáveis de ambiente e também em arquivo.
    if (tokenData.access_token) process.env.TAGPLUS_ACCESS_TOKEN = tokenData.access_token;
    if (tokenData.refresh_token) process.env.TAGPLUS_REFRESH_TOKEN = tokenData.refresh_token;
    await saveStoredTagPlusTokens(tokenData);

    return res.json({ ok: true, tokenData });
  } catch (err: any) {
    console.error("Error exchanging code for token:", err?.response?.data || err.message || err);
    return res.status(500).json({ ok: false, error: err?.response?.data || err.message || String(err) });
  }
});

export const apiTagPlus = onRequest(
  {
    region: "southamerica-east1",
  },
  appTagPlus
);
