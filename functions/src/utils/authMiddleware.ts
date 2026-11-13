import { Request, Response, NextFunction } from "express";
import * as admin from "firebase-admin";
import { logError, logSecurityEvent } from "./logger";

const allowedSuffixes = [
  "desenhar@gmail.com",
  "@desenhardigital.com.br",
  "@copiadoradesenhar.com.br",
];

type CachedUserProfile = {
  statusConta?: boolean;
  setor?: string;
  setorNome?: string;
  displayName?: string;
};

type CachedUserEntry = {
  profile: CachedUserProfile;
  expiresAt: number;
};

const userProfileCache = new Map<string, CachedUserEntry>();

function getUserAuthCacheTtlMs(): number {
  const configured = process.env.USER_AUTH_CACHE_TTL_MS;
  if (configured !== undefined) {
    const parsed = Number(configured);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
  return process.env.NODE_ENV === "test" ? 0 : 45_000;
}

export function invalidateUserAuthCache(uid?: string): void {
  if (uid) {
    userProfileCache.delete(uid);
    return;
  }
  userProfileCache.clear();
}

export function normalizeSetor(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

export function createSetorMiddleware(
  allowedSectors: readonly string[],
  denialMessage = "Acesso negado para este setor."
) {
  const normalizedAllowed = new Set(allowedSectors.map((sector) => normalizeSetor(sector)).filter(Boolean));

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !user.uid) {
      res.status(401).json({ message: "Não autenticado" });
      return;
    }

    const setor = normalizeSetor(user.setor);
    const setorNome = normalizeSetor(user.setorNome ?? user.setorName);
    const isAllowed =
      (setor && normalizedAllowed.has(setor)) ||
      (setorNome && normalizedAllowed.has(setorNome));

    if (!isAllowed) {
      logSecurityEvent("auth.denied.sector_forbidden", {
        uid: user.uid,
        setor: setor || setorNome || "unknown",
      });
      res.status(403).json({ message: denialMessage });
      return;
    }

    next();
  };
}

async function getUserProfile(uid: string): Promise<CachedUserProfile | null> {
  const ttlMs = getUserAuthCacheTtlMs();
  const now = Date.now();
  if (ttlMs > 0) {
    const cached = userProfileCache.get(uid);
    if (cached && cached.expiresAt > now) {
      return cached.profile;
    }
    if (cached) {
      userProfileCache.delete(uid);
    }
  }

  const db = admin.firestore();
  const userDoc = await db.collection("usuarios").doc(uid).get();
  if (!userDoc.exists) {
    return null;
  }

  const userData = (userDoc.data() || {}) as CachedUserProfile;
  const profile: CachedUserProfile = {
    statusConta: userData.statusConta,
    setor: userData.setor,
    setorNome: userData.setorNome,
    displayName: userData.displayName,
  };

  if (ttlMs > 0) {
    userProfileCache.set(uid, {
      profile,
      expiresAt: now + ttlMs,
    });
  }

  return profile;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const email = decodedToken.email || "";
        const isAllowed = allowedSuffixes.some((suffix) =>
          email.endsWith(suffix)
        );
        if (!isAllowed) {
          logSecurityEvent("auth.denied.email_not_allowed", {
            uid: decodedToken.uid,
          });
          res.status(403).json({ message: "Acesso negado" });
          return;
        }

        (req as any).user = decodedToken;

        try {
          const userData = await getUserProfile(decodedToken.uid);

          if (!userData) {
            logSecurityEvent("auth.denied.user_not_registered", {
              uid: decodedToken.uid,
            });
            res.status(403).json({ message: "Usuário não cadastrado no sistema" });
            return;
          }

          // Verificar se o usuário está ativo
          if (userData.statusConta === false) {
            logSecurityEvent("auth.denied.user_disabled", {
              uid: decodedToken.uid,
            });
            res.status(403).json({ message: "Conta desativada. Entre em contato com o administrador." });
            return;
          }

          (req as any).user = {
            ...(req as any).user,
            setor: userData.setor,
            setorNome: userData.setorNome,
            setorName: userData.setorNome,
            displayName: userData.displayName || decodedToken.name,
          };
        } catch (error) {
          logError("Erro ao buscar dados adicionais do usuário:", error);
          logSecurityEvent("auth.denied.authorization_service_unavailable", {
            uid: decodedToken.uid,
          }, "error");
          res.status(503).json({ message: "Serviço de autorização temporariamente indisponível" });
          return;
        }

        Object.freeze((req as any).user);

        next();
        return;
      } catch (err) {
        logSecurityEvent("auth.denied.invalid_token");
        res.status(401).json({ message: "Token inválido" });
        return;
      }
    }
    logSecurityEvent("auth.denied.missing_token");
    res.status(401).json({ message: "Não autenticado" });
    return;
  } catch (error) {
    // Captura QUALQUER erro não tratado - CRÍTICO para firebase-admin 12.6.0+
    logError("Erro fatal no authMiddleware:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Erro interno de autenticação" });
    }
  }
}