/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuth } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import type { Pedido } from "../types/Pedidos";
import type { SetorValue } from "../types/Setores";

import { fetchWithAuth } from "../utils/fetchWithAuth";

const API_URL = import.meta.env.VITE_API_URL;

export async function criarPedido({
  formData,
  selectedResponsibleUser,
  setoresResponsaveis,
  prazosToSave,
  servicoToSave,
  statusInicial,
  userDisplayName,
  userSetorLabel,
  origem,
  atendimentoId,
  codigoClienteOmie,
  retrabalho,
}: {
  formData: any;
  selectedResponsibleUser: { displayName: string };
  setoresResponsaveis: SetorValue[];
  prazosToSave: Pedido["prazos"];
  servicoToSave: Pedido["servico"];
  statusInicial: string;
  userDisplayName: string;
  userSetorLabel: string;
  origem?: string;
  atendimentoId?: string;
  codigoClienteOmie?: number;
  retrabalho?: boolean;
}) {
  const now = Timestamp.now();

  const pedidoData = {
    ...formData,
    responsavel: selectedResponsibleUser.displayName,
    setoresResponsaveis,
    prazos: {
      entrega: prazosToSave.entrega,
      arte: prazosToSave.arte ?? null,
    },
    servico: servicoToSave,
    statusAtual: statusInicial,
    historicoStatus: [
      {
        status: statusInicial,
        data: now,
        responsavel: userDisplayName,
        setor: userSetorLabel,
      },
    ],
    criadoEm: now,
    atualizadoEm: now,
    ...(origem ? { origem } : {}),
    ...(atendimentoId ? { atendimentoId } : {}),
    ...(codigoClienteOmie ? { codigoClienteOmie } : {}),
    ...(retrabalho !== undefined ? { retrabalho } : {}),
  };

  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Usuário não autenticado");
  const userToken = await currentUser.getIdToken();

  const response = await fetchWithAuth(`${API_URL}/dashboard/criarPedido`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify(pedidoData),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Erro na resposta:", response.status, text);
    throw new Error("Erro na API");
  }
  const data = await response.json();

  return data;
}

export async function atualizarPedidoBackend(
  pedidoID: string,
  updateData: any
) {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Usuário não autenticado");
  const userToken = await currentUser.getIdToken();

  const response = await fetchWithAuth(`${API_URL}/dashboard/editarPedido`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ pedidoID, ...updateData }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Erro na resposta:", response.status, text);
    throw new Error("Erro na API");
  }
  const data = await response.json();

  return data;
}

export async function deletarPedidoBackend(pedidoID: string) {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Usuário não autenticado");
  const userToken = await currentUser.getIdToken();

  const response = await fetchWithAuth(`${API_URL}/dashboard/deletarPedido`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ pedidoID }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Erro na resposta:", response.status, text);
    throw new Error("Erro na API");
  }
  const data = await response.json();

  return data;
}

export async function buscarPedidos(
  params: Record<string, string>,
  token: string
) {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetchWithAuth(
    `${API_URL}/dashboard/buscarPedidos?${queryString}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.json();
}

export async function marcarComoEntregueBackend(pedidoID: string) {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Usuário não autenticado");
  const userToken = await currentUser.getIdToken();

  const response = await fetchWithAuth(
    `${API_URL}/dashboard/marcarComoEntregue`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ pedidoID }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("Erro na resposta:", response.status, text);
    throw new Error("Erro ao marcar como entregue");
  }
  return await response.json();
}

export async function buscarPedidosRelatorio(
  params: Record<string, string>,
  token: string
) {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetchWithAuth(
    `${API_URL}/relatorios/buscarPedidos?${queryString}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    const text = await response.text();
    console.error("Erro na resposta:", response.status, text);
    throw new Error("Erro ao buscar pedidos para relatório");
  }
  return response.json();
}
