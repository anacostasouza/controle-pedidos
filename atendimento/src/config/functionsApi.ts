type FunctionsTarget = "emulator" | "production";

const DEFAULT_PROJECT_ID = "gestaopedidos-desenhar";
const DEFAULT_FUNCTIONS_REGION = "southamerica-east1";
const DEFAULT_USERS_REGION = "southamerica-east1";
const DEFAULT_EMULATOR_HOST = "127.0.0.1:9000";
const DEFAULT_ATENDIMENTO_FUNCTION_NAME = "atendimentoApi";
const DEFAULT_USUARIOS_FUNCTION_NAME = "usuariosApi";

function resolveTarget(): FunctionsTarget {
  const explicitTarget = (import.meta.env.VITE_FUNCTIONS_TARGET as string | undefined)
    ?.trim()
    .toLowerCase();

  if (explicitTarget === "emulator" || explicitTarget === "production") {
    return explicitTarget;
  }

  // Auto mode: dev -> emulator, build/prod -> cloud functions.
  return import.meta.env.DEV ? "emulator" : "production";
}

function buildFunctionsBaseUrl(functionName: string, region: string): string {
  const target = resolveTarget();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID;

  if (target === "emulator") {
    const emulatorHost = import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST || DEFAULT_EMULATOR_HOST;
    return `http://${emulatorHost}/${projectId}/${region}/${functionName}`;
  }

  return `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
}

export const ATENDIMENTO_API_BASE_URL = buildFunctionsBaseUrl(
  import.meta.env.VITE_ATENDIMENTO_FUNCTION_NAME || DEFAULT_ATENDIMENTO_FUNCTION_NAME,
  import.meta.env.VITE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION
);

export const USUARIOS_API_BASE_URL = buildFunctionsBaseUrl(
  import.meta.env.VITE_USUARIOS_FUNCTION_NAME || DEFAULT_USUARIOS_FUNCTION_NAME,
  import.meta.env.VITE_USERS_FUNCTION_REGION || DEFAULT_USERS_REGION
);
