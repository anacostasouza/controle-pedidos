/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuth } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import type { Pedido } from "../types/Pedidos";
import type { SetorValue } from "../types/Setores";

import { fetchWithAuth } from "../utils/FetchWithAuth";
import { CONTROLE_PEDIDOS_API_BASE_URL } from "../config/functionsApi";

const API_URL = CONTROLE_PEDIDOS_API_BASE_URL;

async function getAuthenticatedSession() {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    globalThis.alert("Usuário não autenticado. Redirecionando para login...");
    globalThis.location.href = "/";
    throw new Error("Usuário não autenticado");
  }

  const userToken = await currentUser.getIdToken(true);
  return { auth, userToken };
}

async function parseErrorData(response: Response): Promise<{ message?: string }> {
  return response.json().catch(() => ({ message: "Erro desconhecido" }));
}

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
  try {
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
    };

    if (origem) pedidoData.origem = origem;
    if (atendimentoId) pedidoData.atendimentoId = atendimentoId;
    if (codigoClienteOmie) pedidoData.codigoClienteOmie = codigoClienteOmie;
    if (retrabalho !== undefined) pedidoData.retrabalho = retrabalho;

    const { auth, userToken } = await getAuthenticatedSession();

    const response = await fetchWithAuth(`${API_URL}/dashboard/criarPedido`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(pedidoData),
    });

    if (!response.ok) {
      const errorData = await parseErrorData(response);
      
      if (response.status === 401) {
        globalThis.alert("Sessão expirada. Redirecionando para login...");
        await auth.signOut();
        globalThis.location.href = "/";
        throw new Error("Sessão expirada");
      } else if (response.status === 403) {
        throw new Error("Sem permissão para realizar esta operação");
      }
      
      throw new Error(errorData.message || "Erro ao criar pedido");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    throw error;
  }
}

export const atualizarPedidoBackend = async (id: string, updateData: any) => {
  try {
    const { auth, userToken } = await getAuthenticatedSession();

    const response = await fetch(`${API_URL}/dashboard/editarPedido`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ pedidoID: id, ...updateData }),
    });

    if (!response.ok) {
      const errorData = await parseErrorData(response);
      
      if (response.status === 401) {
        globalThis.alert("Sessão expirada. Redirecionando para login...");
        await auth.signOut();
        globalThis.location.href = "/";
        throw new Error("Sessão expirada");
      } else if (response.status === 403) {
        throw new Error("Sem permissão para realizar esta operação");
      }
      
      throw new Error(errorData.message || "Erro ao atualizar pedido");
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    throw error;
  }
};

export async function deletarPedidoBackend(pedidoID: string) {
  try {
    const { auth, userToken } = await getAuthenticatedSession();

    const response = await fetchWithAuth(`${API_URL}/dashboard/deletarPedido`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ pedidoID }),
    });

    if (!response.ok) {
      const errorData = await parseErrorData(response);
      
      if (response.status === 401) {
        globalThis.alert("Sessão expirada. Redirecionando para login...");
        await auth.signOut();
        globalThis.location.href = "/";
        throw new Error("Sessão expirada");
      } else if (response.status === 403) {
        throw new Error("Sem permissão para realizar esta operação");
      }
      
      throw new Error(errorData.message || "Erro ao deletar pedido");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Erro ao deletar pedido:", error);
    throw error;
  }
}

export async function buscarPedidos(
  params: Record<string, string>,
  token: string
) {
  try {
    let authToken = token;
    
    if (!authToken) {
      const { userToken } = await getAuthenticatedSession();
      authToken = userToken;
    }

    const queryString = new URLSearchParams(params).toString();
    
    const response = await fetchWithAuth(
      `${API_URL}/dashboard/buscarPedidos?${queryString}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    if (!response.ok) {
      const errorData = await parseErrorData(response);
      
      if (response.status === 401) {
        globalThis.alert("Sessão expirada. Redirecionando para login...");
        const auth = getAuth();
        await auth.signOut();
        globalThis.location.href = "/";
        throw new Error("Sessão expirada");
      } else if (response.status === 403) {
        throw new Error("Sem permissão para realizar esta operação");
      }
      
      throw new Error(errorData.message || "Erro ao buscar pedidos");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    throw error;
  }
}

export async function marcarComoEntregueBackend(pedidoID: string) {
  try {
    const { auth, userToken } = await getAuthenticatedSession();

    const response = await fetch(
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


    const responseData = await parseErrorData(response);

    if (!response.ok) {
      if (response.status === 401) {
        globalThis.alert("Sessão expirada. Redirecionando para login...");
        await auth.signOut();
        globalThis.location.href = "/";
        throw new Error("Sessão expirada");
      } else if (response.status === 403) {
        throw new Error(`Sem permissão: ${responseData.message || "Você não tem permissão para esta operação"}`);
      } else if (response.status === 400) {
        throw new Error(`Erro de validação: ${responseData.message || "Verifique os dados informados"}`);
      } else {
        throw new Error(responseData.message || "Erro ao marcar como entregue");
      }
    }
    
    return responseData;
  } catch (error) {
    console.error("Erro ao marcar como entregue:", error);
    throw error;
  }
}

export async function buscarPedidosRelatorio(
  params: Record<string, string>,
  token: string
) {
  try {
    let authToken = token;
    
    if (!authToken) {
      const { userToken } = await getAuthenticatedSession();
      authToken = userToken;
    }

    const queryString = new URLSearchParams(params).toString();
    
    const response = await fetchWithAuth(
      `${API_URL}/relatorios/buscarPedidos?${queryString}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    if (!response.ok) {
      const errorData = await parseErrorData(response);
      
      if (response.status === 401) {
        globalThis.alert("Sessão expirada. Redirecionando para login...");
        const auth = getAuth();
        await auth.signOut();
        globalThis.location.href = "/";
        throw new Error("Sessão expirada");
      } else if (response.status === 403) {
        throw new Error("Sem permissão para realizar esta operação");
      }
      
      throw new Error(errorData.message || "Erro ao buscar pedidos para relatório");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar pedidos para relatório:", error);
    throw error;
  }
}


export async function buscarClienteOmie(termo: string) {
  try {
    const { auth, userToken } = await getAuthenticatedSession();

    // Verifica se o termo é um CPF/CNPJ (apenas números)
    const apenasNumeros = termo.replace(/\D/g, '');
    let razao_social = '';
    let cnpj_cpf = '';

    // Se tiver 11 ou mais dígitos, considera como CPF/CNPJ
    if (apenasNumeros.length >= 11) {
      cnpj_cpf = apenasNumeros;
    } else {
      razao_social = termo;
    }

    const clientesFiltro = [{ razao_social, cnpj_cpf }];

    const response = await fetchWithAuth(`${API_URL}/omie/buscarClientes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ clientesFiltro }),
    });

    if (!response.ok) {
      const errorData = await parseErrorData(response);

      if (response.status === 401) {
        globalThis.alert("Sessão expirada. Redirecionando para login...");
        await auth.signOut();
        globalThis.location.href = "/";
        throw new Error("Sessão expirada");
      } else if (response.status === 403) {
        throw new Error("Sem permissão para realizar esta operação");
      } else if (response.status === 404) {
        return { clientes: [] };
      }

      throw new Error(errorData.message || "Erro ao buscar cliente Omie");
    }

    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar cliente Omie:", error);
    throw error;
  }
}