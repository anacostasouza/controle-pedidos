/* eslint-disable @typescript-eslint/no-explicit-any */
import { getFirestore, collection, getDocs, doc, onSnapshot, query, getDoc, addDoc, Timestamp } from "firebase/firestore";
import { app, db } from "./firebase"; 
import { fetchWithAuth } from "../utils/FetchWithAuth";
import { getAuth } from "firebase/auth";
import { ATENDIMENTO_API_BASE_URL } from "../config/functionsApi";

const API_URL = ATENDIMENTO_API_BASE_URL;

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const text = await response.text();
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text) as { message?: string };
    return parsed.message || text;
  } catch {
    return text;
  }
}

async function requestPublicJson(endpoint: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, init);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Erro na requisição"));
  }
  return response.json();
}

async function requestAuthJson(endpoint: string, init: RequestInit = {}) {
  const response = await fetchWithAuth(`${API_URL}${endpoint}`, init);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Erro na requisição autenticada"));
  }
  return response.json();
}

export interface ServicoAtendimento {
  tipo: string;
}

export async function buscarServicosAtendimento(): Promise<ServicoAtendimento[]> {
  const db = getFirestore(app);
  const col = collection(db, "servicosAtendimento");
  const snap = await getDocs(col);
  return snap.docs.map(doc => doc.data() as ServicoAtendimento);
}

export async function criarAtendimentoFila(data: {
  nomeCliente: string;
  tipoAtendimento: string;
  prioridade?: "convencional" | "preferencial";
}) {
  return requestPublicJson("/criarAtendimentoFila", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function filaAtendimento() {
  return requestAuthJson("/filaAtendimento", {
    method: "GET",
  });
}

export async function deletarAtendimento(id: string) {
  return requestAuthJson(`/deletarAtendimento/${id}`, {
    method: "DELETE",
  });
}

// Atualizar historico do atendimento
export async function atualizarHistoricoAtendimento(
  id: string, 
  status: string, 
  responsavel?: string, 
  atendente?: string, 
  atendenteUid?: string
) {
  const currentUser = getAuth().currentUser;
  if (!currentUser) throw new Error("Usuário não autenticado");

  const responsavelFinal = responsavel || currentUser.displayName || currentUser.email || "Desconhecido";

  const body: any = { 
    status,
    responsavel: responsavelFinal 
  };
  if (atendente) body.atendente = atendente;
  if (atendenteUid) body.atendenteUid = atendenteUid;

  return requestAuthJson(`/atualizarHistorico/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// Adicionar controle de pedidos
export const handleAdicionarControlePedidos = (atendimento: any) => {
  const params = new URLSearchParams({
    nomeCliente: atendimento.nomeCliente || "",
    codigoClienteTagPlus: atendimento.codigoClienteTagPlus?.toString() || "",
    numeroPedido: atendimento.codigoPedido || "",
    atendimentoId: atendimento.id,
    origem: "atendimento"
  }).toString();

  console.log("MODE:", import.meta.env.MODE);
  console.log("DEV URL:", import.meta.env.VITE_CONTROLE_PEDIDOS_URL_DEV);
  console.log("PROD URL:", import.meta.env.VITE_CONTROLE_PEDIDOS_URL_PROD);

  const baseUrl = import.meta.env.MODE === "development" 
  ? import.meta.env.VITE_CONTROLE_PEDIDOS_URL_DEV
  : import.meta.env.VITE_CONTROLE_PEDIDOS_URL_PROD;

  globalThis.location.href = `${baseUrl}?${params}`;
};

export function listenFilaAtendimento(callback: (fila: any[]) => void) {
  const q = query(collection(db, "atendimentos"));
  return onSnapshot(q, (snapshot) => {
    const fila = snapshot.docs.map((doc) =>
      ({ id: doc.id, ...doc.data() })
    );
    callback(fila);
  });
};

export async function getNomeAtendente(uid: string): Promise<string | undefined> {
  const db = getFirestore();
  const docRef = doc(db, "usuarios", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().displayName;
  }
  return undefined;
}

// Buscar atendimentos para relatório
export async function buscarTodosAtendimentos() {
  return requestAuthJson("/todosAtendimentos", {
    method: "GET",
  });
}

export async function logDeleteAtendimento(log: {
  atendimentoId: string;
  nomeCliente: string;
  justificativa: string;
  data: Timestamp;
  responsavelNome: string;
}) {
  const db = getFirestore();
  await addDoc(collection(db, "logAtendimentos"), {
    ...log,
    acao: "delete",
  });
}

export async function buscarClienteTagPlus(termo: string) {

  try {

    const apenasNumeros = termo.replace(/\D/g, '');
    let razao_social = '';
    let cnpj_cpf = '';

    // CPF/CNPJ só quando for exatamente 11 ou 14 dígitos
    if (/^(\d{11}|\d{14})$/.test(apenasNumeros)) {
      cnpj_cpf = apenasNumeros;
    } else {
      razao_social = termo;
    }

    const clientesFiltro = [{ razao_social, cnpj_cpf }];

    const response = await fetchWithAuth(`${API_URL}/tagplus/buscarCliente`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ clientesFiltro }),
    });

    if (!response.ok) {
      const textoErro = await response.text();
      console.error(`Erro HTTP ${response.status}:`, textoErro);
      throw new Error(`Erro na API (${response.status}). Verifique o console do backend.`);
    }

    return response.json();
  } catch (error) {
    console.error("Erro ao buscar cliente TagPlus:", error);
    throw error;
  }
}

// Registrar atendimento

export async function registrarAtendimento(atendimentoData: any): Promise<string> {
  const result = await requestPublicJson("/criarAtendimentoFila", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(atendimentoData),
  });
  return result.atendimentoId;
}

// Buscar historico
export async function buscarHistoricoComFiltros(
  dataInicio: string,
  dataFim: string,
  filtros?: {
    status?: string;
    atendenteUid?: string;
    tipo?: string;
    consumidor?: boolean; 
    tipoAtendimento?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{
  atendimentos: any[];
  total: number;
  filtrosAplicados: string[];
  estatisticas: any;
  temMais?: boolean;
}> {
  const params = new URLSearchParams({
    dataInicio,
    dataFim,
  });

  if (filtros?.status) params.append("status", filtros.status);
  if (filtros?.atendenteUid) params.append("atendenteUid", filtros.atendenteUid);
  if (filtros?.tipo) params.append("tipo", filtros.tipo);
  if (filtros?.consumidor !== undefined) {
    params.append("consumidor", filtros.consumidor.toString());
  }
  if (filtros?.tipoAtendimento) params.append("tipoAtendimento", filtros.tipoAtendimento);
  if (filtros?.limit !== undefined) params.append("limit", String(filtros.limit));
  if (filtros?.offset !== undefined) params.append("offset", String(filtros.offset));

  const response = await fetchWithAuth(`${API_URL}/historico?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) throw new Error(await readErrorMessage(response, "Erro ao buscar histórico"));
  return response.json();
}