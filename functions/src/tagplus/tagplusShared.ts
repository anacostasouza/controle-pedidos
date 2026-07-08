import * as admin from "firebase-admin";
import axios from "axios";
import { promises as fs } from "fs";
import path from "path";
import type { TagPlusClienteResumo } from "./TagPlusClient";

export type StoredTagPlusTokens = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  saved_at?: string;
};

const TAGPLUS_TOKEN_FILE = path.join(process.cwd(), ".tagplus-tokens.json");
const TAGPLUS_TOKEN_DOC_PATH = ["configuracoes", "tagplus"] as const;
const TAGPLUS_TOKEN_REFRESH_SAFETY_SECONDS = Number(
  process.env.TAGPLUS_TOKEN_REFRESH_SAFETY_SECONDS || 300
);

let cachedTagPlusTokens: StoredTagPlusTokens | null = null;
let cachedTagPlusTokensLoadPromise: Promise<StoredTagPlusTokens | null> | null = null;
let tagPlusReauthLogged = false;

function createFormBody(codeOrRefreshToken: string, clientId: string, clientSecret: string, grantType: "authorization_code" | "refresh_token") {
  const params = new URLSearchParams();
  params.append("grant_type", grantType);
  if (grantType === "authorization_code") {
    params.append("code", codeOrRefreshToken);
  } else {
    params.append("refresh_token", codeOrRefreshToken);
  }
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  return params.toString();
}

async function postTokenRequest(
  tokenUrl: string,
  body: string,
  clientId: string,
  clientSecret: string
) {
  try {
    const firstAttempt = await axios.post(tokenUrl, body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return firstAttempt.data;
  } catch (error: any) {
    const apiError = error?.response?.data;
    const apiErrorCode = apiError?.error || apiError?.error_code;

    if (apiErrorCode !== "invalid_client") {
      throw error;
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const secondAttempt = await axios.post(tokenUrl, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
    });

    return secondAttempt.data;
  }
}

export async function loadStoredTagPlusTokens(): Promise<StoredTagPlusTokens | null> {
  if (cachedTagPlusTokens) {
    return cachedTagPlusTokens;
  }

  if (!cachedTagPlusTokensLoadPromise) {
    cachedTagPlusTokensLoadPromise = loadStoredTagPlusTokensFromPersistence().then((tokens) => {
      cachedTagPlusTokens = tokens;
      return tokens;
    });
  }

  return cachedTagPlusTokensLoadPromise;
}

export async function saveStoredTagPlusTokens(tokens: StoredTagPlusTokens): Promise<void> {
  const payload: StoredTagPlusTokens = {
    ...tokens,
    saved_at: new Date().toISOString(),
  };

  cachedTagPlusTokens = payload;
  await saveStoredTagPlusTokensToFirestore(payload);

  try {
    await fs.writeFile(TAGPLUS_TOKEN_FILE, JSON.stringify(payload, null, 2), "utf8");
  } catch {
    // Ignora falha de arquivo local em produção; o estado já foi persistido no Firestore.
  }
}

function hasTokenExpired(tokens: StoredTagPlusTokens, now = Date.now()): boolean {
  if (!tokens.access_token) {
    return true;
  }

  if (!tokens.expires_in || !tokens.saved_at) {
    return false;
  }

  const savedAtMillis = new Date(tokens.saved_at).getTime();
  if (Number.isNaN(savedAtMillis)) {
    return false;
  }

  const expiresAtMillis = savedAtMillis + tokens.expires_in * 1000;
  const refreshThresholdMillis = expiresAtMillis - TAGPLUS_TOKEN_REFRESH_SAFETY_SECONDS * 1000;
  return now >= refreshThresholdMillis;
}

function logTagPlusReauthorizationRequired(reason: string): void {
  if (tagPlusReauthLogged) {
    return;
  }

  tagPlusReauthLogged = true;
  console.warn(`[TAGPLUS] Reautorização necessária: ${reason}`);
}

async function loadStoredTagPlusTokensFromFirestore(): Promise<StoredTagPlusTokens | null> {
  try {
    const snapshot = await admin
      .firestore()
      .collection(TAGPLUS_TOKEN_DOC_PATH[0])
      .doc(TAGPLUS_TOKEN_DOC_PATH[1])
      .get();

    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data() as StoredTagPlusTokens;
  } catch {
    return null;
  }
}

async function loadStoredTagPlusTokensFromPersistence(): Promise<StoredTagPlusTokens | null> {
  const firestoreTokens = await loadStoredTagPlusTokensFromFirestore();
  if (firestoreTokens) {
    return firestoreTokens;
  }

  try {
    const raw = await fs.readFile(TAGPLUS_TOKEN_FILE, "utf8");
    return JSON.parse(raw) as StoredTagPlusTokens;
  } catch {
    return null;
  }
}

async function saveStoredTagPlusTokensToFirestore(tokens: StoredTagPlusTokens): Promise<void> {
  try {
    await admin
      .firestore()
      .collection(TAGPLUS_TOKEN_DOC_PATH[0])
      .doc(TAGPLUS_TOKEN_DOC_PATH[1])
      .set(tokens, { merge: true });
  } catch {
    // Mantém o fallback em arquivo para desenvolvimento/emulador.
  }
}

export async function exchangeTagPlusCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string
) {
  const tokenUrl = "https://api.tagplus.com.br/oauth2/token";
  const body = createFormBody(code, clientId, clientSecret, "authorization_code");
  return postTokenRequest(tokenUrl, body, clientId, clientSecret);
}

export async function refreshTagPlusAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
) {
  const tokenUrl = "https://api.tagplus.com.br/oauth2/token";
  const body = createFormBody(refreshToken, clientId, clientSecret, "refresh_token");
  return postTokenRequest(tokenUrl, body, clientId, clientSecret);
}

type EnsureTagPlusAccessTokenOptions = {
  forceRefresh?: boolean;
};

export async function ensureTagPlusAccessToken(
  options: EnsureTagPlusAccessTokenOptions = {}
): Promise<StoredTagPlusTokens | null> {
  const storedTokens = await loadStoredTagPlusTokens();
  if (!storedTokens) {
    return null;
  }

  const clientId = process.env.TAGPLUS_CLIENT_ID;
  const clientSecret = process.env.TAGPLUS_CLIENT_SECRET;
  const shouldRefresh =
    options.forceRefresh ||
    !storedTokens.access_token ||
    hasTokenExpired(storedTokens);

  if (!shouldRefresh) {
    process.env.TAGPLUS_ACCESS_TOKEN = storedTokens.access_token;
    if (storedTokens.refresh_token) {
      process.env.TAGPLUS_REFRESH_TOKEN = storedTokens.refresh_token;
    }
    return storedTokens;
  }

  if (!storedTokens.refresh_token || !clientId || !clientSecret) {
    logTagPlusReauthorizationRequired("refresh token indisponível ou credenciais ausentes");
    return storedTokens;
  }

  let refreshedTokenData: any;
  try {
    refreshedTokenData = await refreshTagPlusAccessToken(
      storedTokens.refresh_token,
      clientId,
      clientSecret
    );
  } catch (error: any) {
    const apiErrorCode = error?.response?.data?.error || error?.response?.data?.error_code;
    const reason = apiErrorCode
      ? `falha ao renovar o refresh token (${apiErrorCode})`
      : "falha ao renovar o refresh token";
    logTagPlusReauthorizationRequired(reason);
    return storedTokens;
  }

  const mergedTokens: StoredTagPlusTokens = {
    ...storedTokens,
    ...refreshedTokenData,
  };

  if (mergedTokens.access_token) {
    process.env.TAGPLUS_ACCESS_TOKEN = mergedTokens.access_token;
  }

  if (mergedTokens.refresh_token) {
    process.env.TAGPLUS_REFRESH_TOKEN = mergedTokens.refresh_token;
  }

  await saveStoredTagPlusTokens(mergedTokens);
  return mergedTokens;
}

function mascararTelefone(ddd: string, numero: string): string {
  if (!numero) return "";
  const ultimos4 = numero.slice(-4);
  return `(${ddd}) ****-${ultimos4}`;
}

export function normalizarDocumento(valor: any): string {
  return String(valor ?? "").replace(/\D/g, "").trim();
}

export function normalizarTexto(valor: any): string {
  return String(valor ?? "").trim();
}

export function mapTagPlusClienteParaLegacy(cliente: TagPlusClienteResumo) {
  const documento = normalizarDocumento(cliente.cnpj_cpf || cliente.cnpj || cliente.cpf);
  if (!documento) return null;

  const codigoCliente =
    cliente.codigo_cliente_omie ??
    cliente.codigo_cliente ??
    cliente.codigo ??
    cliente.id ??
    "";

  const nome =
    normalizarTexto(cliente.razao_social) ||
    normalizarTexto(cliente.nome_fantasia) ||
    normalizarTexto(cliente.nome) ||
    normalizarTexto(cliente.fantasia) ||
    "Cliente sem nome";

  const telefoneDdd = normalizarTexto(cliente.telefone1_ddd || "");
  const telefoneNumero = normalizarTexto(
    cliente.telefone || cliente.telefone1_numero || ""
  );

  return {
    codigo_cliente_omie: codigoCliente,
    nome,
    cnpj_cpf: documento,
    telefone: mascararTelefone(telefoneDdd, telefoneNumero),
  };
}
