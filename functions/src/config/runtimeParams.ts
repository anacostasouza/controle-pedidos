import { defineString } from "firebase-functions/params";

export const OMIE_APP_KEY = defineString("OMIE_APP_KEY");
export const OMIE_APP_SECRET = defineString("OMIE_APP_SECRET");
export const OMIE_BASE_URL_CLIENTS = defineString("OMIE_BASE_URL_CLIENTS");

function resolveParamValue(paramValue: string | undefined, envValue: string | undefined): string | undefined {
  if (paramValue && paramValue.trim()) {
    return paramValue.trim();
  }

  if (envValue && envValue.trim()) {
    return envValue.trim();
  }

  return undefined;
}

function tryReadParamValue(read: () => string): string | undefined {
  try {
    const value = read();
    return value?.trim() ? value.trim() : undefined;
  } catch {
    // In local/emulator edge cases, params resolution may throw; fallback to process.env.
    return undefined;
  }
}

export function getOmieRuntimeConfig() {
  const appKey = resolveParamValue(
    tryReadParamValue(() => OMIE_APP_KEY.value()),
    process.env.OMIE_APP_KEY
  );
  const appSecret = resolveParamValue(
    tryReadParamValue(() => OMIE_APP_SECRET.value()),
    process.env.OMIE_APP_SECRET
  );
  const baseUrlClients = resolveParamValue(
    tryReadParamValue(() => OMIE_BASE_URL_CLIENTS.value()),
    process.env.OMIE_BASE_URL_CLIENTS
  );

  return {
    appKey,
    appSecret,
    baseUrlClients,
  };
}

