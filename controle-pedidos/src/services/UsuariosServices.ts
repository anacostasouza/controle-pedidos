﻿import { fetchWithAuth } from "../utils/FetchWithAuth";
import { USUARIOS_API_BASE_URL } from "../config/functionsApi";

const API_URL = USUARIOS_API_BASE_URL;

export interface UsuarioResponse {
  usuarioID: string;
  email: string;
  displayName: string;
  setor: string;
  setorNome: string;
  statusConta: boolean;
  createdAt: string | number;
  updatedAt: string | number;
}

export interface CriarUsuarioRequest {
  email: string;
  displayName: string;
  setor: string;
}

export interface AtualizarUsuarioRequest {
  displayName?: string;
  setor?: string;
  statusConta?: boolean;
}

type StatusMessages = Record<number, string>;

async function requestUsuarios<T>(
  path: string,
  init: RequestInit,
  statusMessages: StatusMessages,
  fallbackMessage: string
): Promise<T> {
  try {
    const response = await fetchWithAuth(`${API_URL}${path}`, init);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erro desconhecido" }));
      const statusMessage = statusMessages[response.status];
      throw new Error(statusMessage || errorData.message || fallbackMessage);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`Erro na requisicao de usuarios (${path}):`, error);
    throw error;
  }
}

/**
 * Listar todos os usuarios (apenas admin)
 */
export async function listarUsuarios(): Promise<UsuarioResponse[]> {
  return requestUsuarios<UsuarioResponse[]>(
    "/usuarios/listar",
    { method: "GET" },
    {
      401: "Sessao expirada",
      403: "Sem permissao para listar usuarios",
    },
    "Erro ao listar usuarios"
  );
}

/**
 * Obter dados de um usuario especifico (apenas admin)
 */
export async function obterUsuario(uid: string): Promise<UsuarioResponse> {
  return requestUsuarios<UsuarioResponse>(
    `/usuarios/${uid}`,
    { method: "GET" },
    {
      401: "Sessao expirada",
      403: "Sem permissao para obter usuario",
      404: "Usuario nao encontrado",
    },
    "Erro ao obter usuario"
  );
}

/**
 * Criar novo usuario (apenas admin)
 */
export async function criarUsuario(data: CriarUsuarioRequest): Promise<UsuarioResponse> {
  return requestUsuarios<UsuarioResponse>(
    "/usuarios/criar",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    {
      401: "Sessao expirada",
      403: "Sem permissao para criar usuario",
      400: "Dados invalidos",
    },
    "Erro ao criar usuario"
  );
}

/**
 * Atualizar usuario (apenas admin)
 */
export async function atualizarUsuario(
  uid: string,
  data: AtualizarUsuarioRequest
): Promise<UsuarioResponse> {
  return requestUsuarios<UsuarioResponse>(
    `/usuarios/${uid}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    {
      401: "Sessao expirada",
      403: "Sem permissao para atualizar usuario",
      404: "Usuario nao encontrado",
      400: "Dados invalidos",
    },
    "Erro ao atualizar usuario"
  );
}

/**
 * Desativar usuario (soft delete)
 */
export async function desativarUsuario(uid: string): Promise<{ message: string; usuarioID: string }> {
  return requestUsuarios<{ message: string; usuarioID: string }>(
    `/usuarios/${uid}/desativar`,
    { method: "PATCH" },
    {
      401: "Sessao expirada",
      403: "Sem permissao para desativar usuario",
      404: "Usuario nao encontrado",
    },
    "Erro ao desativar usuario"
  );
}

/**
 * Deletar usuario permanentemente (apenas admin)
 */
export async function deletarUsuario(uid: string): Promise<{ message: string; usuarioID: string }> {
  return requestUsuarios<{ message: string; usuarioID: string }>(
    `/usuarios/${uid}`,
    { method: "DELETE" },
    {
      401: "Sessao expirada",
      403: "Sem permissao para deletar usuario",
      404: "Usuario nao encontrado",
      400: "Nao e possivel deletar este usuario",
    },
    "Erro ao deletar usuario"
  );
}

/**
 * Ativar usuario (reverter soft delete)
 */
export async function ativarUsuario(uid: string): Promise<{ message: string; usuarioID: string }> {
  return requestUsuarios<{ message: string; usuarioID: string }>(
    `/usuarios/${uid}/ativar`,
    { method: "PATCH" },
    {
      401: "Sessao expirada",
      403: "Sem permissao para ativar usuario",
      404: "Usuario nao encontrado",
    },
    "Erro ao ativar usuario"
  );
}
