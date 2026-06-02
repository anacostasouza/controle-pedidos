import type express from "express";
import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";

const DEFAULT_PROD_ALLOWED_ORIGINS = new Set([
  "https://gestaopedidos-desenhar.web.app",
  "https://gestaopedidos-desenhar.firebaseapp.com",
  "https://atendimento-desenhardigital.web.app",
  "https://atendimento-desenhardigital.firebaseapp.com",
]);

const ALLOWED_ORIGINS_BY_ENV: Record<string, string> = {
  production: "ALLOWED_ORIGINS_PRODUCTION",
  staging: "ALLOWED_ORIGINS_STAGING",
  test: "ALLOWED_ORIGINS_TEST",
  development: "ALLOWED_ORIGINS_DEVELOPMENT",
};

function parseOrigins(rawOrigins: string | undefined): string[] {
  if (!rawOrigins) {
    return [];
  }

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getConfiguredAllowedOrigins(): Set<string> {
  const currentEnv = (process.env.NODE_ENV || "development").toLowerCase();
  const envVarName = ALLOWED_ORIGINS_BY_ENV[currentEnv];

  const scopedOrigins = parseOrigins(envVarName ? process.env[envVarName] : undefined);
  if (scopedOrigins.length > 0) {
    return new Set(scopedOrigins);
  }

  const fallbackOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);
  if (fallbackOrigins.length > 0) {
    return new Set(fallbackOrigins);
  }

  if (currentEnv === "production") {
    return DEFAULT_PROD_ALLOWED_ORIGINS;
  }

  return new Set();
}

function isLoopbackIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.endsWith("127.0.0.1") ||
    ip.endsWith("::1")
  );
}

function getRequestIp(req: {
  ip?: string;
  socket?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
}): string {
  if (req.ip && req.ip.trim()) {
    return req.ip.trim();
  }

  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const firstForwardedIp = forwarded
      .split(",")
      .map((part) => part.trim())
      .find(Boolean);

    if (firstForwardedIp) {
      return firstForwardedIp;
    }
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    const first = forwarded[0]?.trim();
    if (first) {
      return first;
    }
  }

  if (req.socket?.remoteAddress && req.socket.remoteAddress.trim()) {
    return req.socket.remoteAddress.trim();
  }

  return "unknown";
}

export function isKnownOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    const allowedOrigins = getConfiguredAllowedOrigins();

    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return true;
    }

    return allowedOrigins.has(parsed.origin);
  } catch {
    return false;
  }
}

export function createStandardCorsMiddleware(
  options: { preflightMode?: "send" | "end" } = {}
): RequestHandler {
  const preflightMode = options.preflightMode ?? "end";

  return (req, res, next) => {
    const origin = req.headers.origin;

    if (origin && isKnownOrigin(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Credentials", "true");
    } else if (origin && !isKnownOrigin(origin)) {
      res.status(403).json({ message: "Origin not allowed" });
      return;
    }

    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      if (preflightMode === "send") {
        res.send();
      } else {
        res.status(200).end();
      }
      return;
    }

    next();
  };
}

export function createSecurityHeadersMiddleware(): RequestHandler {
  return (req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "DENY");
    res.set("X-XSS-Protection", "1; mode=block");
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  };
}

export function applyStandardCors(
  app: express.Express,
  options: { preflightMode?: "send" | "end" } = {}
): void {
  app.use(createStandardCorsMiddleware(options));
}

export function applySecurityHeaders(app: express.Express): void {
  app.use(createSecurityHeadersMiddleware());
}

export function createDefaultRateLimiter() {
  return rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Muitas requisições deste IP, tente novamente em 5 minutos.",
    },
    keyGenerator: (req) => getRequestIp(req),
    skip: (req) => {
      const isDev = process.env.NODE_ENV !== "production";
      const remoteIp = getRequestIp(req);
      return isDev && isLoopbackIp(remoteIp);
    },
  });
}
