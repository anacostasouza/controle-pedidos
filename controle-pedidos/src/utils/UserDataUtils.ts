import type { Setor } from "../types/Setores";
import type { Usuario } from "../types/Usuario";
import type { UsuarioResponse } from "../services/UsuariosServices";

type FirestoreUsuarioData = {
  displayName?: string;
  email?: string;
  setor?: string;
  setorNome?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  statusConta?: boolean;
};

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;

  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  return new Date();
}

function resolveSetorNome(setor: string | undefined, setorNome: string | undefined, setores: Setor[]): string {
  if (setor) {
    const local = setores.find((item) => item.value === setor);
    if (local?.label) return local.label;
  }

  return setorNome ?? "";
}

export function mapUsuarioFromApi(
  user: Partial<UsuarioResponse> & { usuarioID: string; setor: string },
  setores: Setor[]
): Usuario {
  return {
    usuarioID: user.usuarioID,
    displayName: user.displayName ?? "",
    email: user.email ?? "",
    setor: user.setor,
    setorNome: resolveSetorNome(user.setor, user.setorNome, setores),
    createdAt: toDate(user.createdAt),
    updatedAt: toDate(user.updatedAt),
    statusConta: user.statusConta ?? true,
  };
}

export function mapUsuarioFromFirestore(
  usuarioID: string,
  userData: FirestoreUsuarioData,
  setores: Setor[],
  fallbackEmail = ""
): Usuario {
  const setor = userData.setor ?? "";

  return {
    usuarioID,
    displayName: userData.displayName ?? "",
    email: userData.email ?? fallbackEmail,
    setor,
    setorNome: resolveSetorNome(setor, userData.setorNome, setores),
    createdAt: toDate(userData.createdAt),
    updatedAt: toDate(userData.updatedAt),
    statusConta: userData.statusConta ?? true,
  };
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}
