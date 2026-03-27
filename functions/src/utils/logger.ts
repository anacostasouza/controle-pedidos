const isDev = process.env.NODE_ENV !== "production";

export function logDev(message: string, ...args: unknown[]) {
  if (isDev) {
    console.log(message, ...args);
  }
}

export function warnDev(message: string, ...args: unknown[]) {
  if (isDev) {
    console.warn(message, ...args);
  }
}

export function logError(message: string, ...args: unknown[]) {
  console.error(message, ...args);
}

type SecurityLevel = "info" | "warn" | "error";

const SECRET_KEY_PATTERN = /(token|authorization|secret|password|api[_-]?key)/i;
const EMAIL_KEY_PATTERN = /email/i;
const UID_KEY_PATTERN = /uid|user[_-]?id/i;

function maskEmail(value: string): string {
  const [localPart, domain] = value.split("@");
  if (!localPart || !domain) {
    return "[REDACTED]";
  }

  return `${localPart.charAt(0)}***@${domain}`;
}

function maskIdentifier(value: string): string {
  if (value.length <= 4) {
    return "****";
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function sanitizePrimitive(value: unknown, keyHint?: string): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const normalizedKey = keyHint || "";

  if (SECRET_KEY_PATTERN.test(normalizedKey)) {
    return "[REDACTED]";
  }

  if (EMAIL_KEY_PATTERN.test(normalizedKey)) {
    return maskEmail(value);
  }

  if (UID_KEY_PATTERN.test(normalizedKey)) {
    return maskIdentifier(value);
  }

  if (value.length > 200) {
    return `${value.slice(0, 200)}...(truncated)`;
  }

  return value;
}

function sanitizeMetadata(
  value: unknown,
  keyHint?: string,
  depth: number = 0
): unknown {
  if (depth > 4) {
    return "[MAX_DEPTH]";
  }

  const sanitizedValue = sanitizePrimitive(value, keyHint);
  if (sanitizedValue !== value) {
    return sanitizedValue;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadata(item, keyHint, depth + 1));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      sanitizeMetadata(entryValue, key, depth + 1),
    ]);

    return Object.fromEntries(entries);
  }

  return value;
}

export function logSecurityEvent(
  event: string,
  metadata: Record<string, unknown> = {},
  level: SecurityLevel = "warn"
) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...((sanitizeMetadata(metadata) as Record<string, unknown>) || {}),
  };

  if (level === "error") {
    console.error("[SECURITY]", payload);
    return;
  }

  if (level === "info") {
    if (isDev) {
      console.log("[SECURITY]", payload);
    }
    return;
  }

  console.warn("[SECURITY]", payload);
}
