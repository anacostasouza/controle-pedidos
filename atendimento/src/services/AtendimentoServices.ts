/* eslint-disable @typescript-eslint/no-explicit-any */
import { getFirestore, collection, getDocs, doc, onSnapshot, query, getDoc, addDoc, Timestamp } from "firebase/firestore";
import { app, db } from "./firebase"; 
import { getAuth } from "firebase/auth";

const API_URL = import.meta.env.VITE_API_URL;

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
}) {
  const response = await fetch(
    `${API_URL}/criarAtendimentoFila`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function filaAtendimento() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch(
    `${API_URL}/filaAtendimento`,
    {
      headers: { "Authorization": `Bearer ${token}` }
    }
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function deletarAtendimento(id: string) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch(
    `${API_URL}/deletarAtendimento/${id}`,
    {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    }
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// Atualizar historico do atendimento

export async function atualizarHistoricoAtendimento(id: string, status: string, atendente?: string, atendenteUid?: string) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const body: any = { status };
  if (atendente) body.atendente = atendente;
  if (atendenteUid) body.atendenteUid = atendenteUid;

  const response = await fetch(
    `${API_URL}/atualizarHistorico/${id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

// Adicionar controle de pedidos
export const handleAdicionarControlePedidos = (atendimento: any) => {
  const params = new URLSearchParams({
    nomeCliente: atendimento.nomeCliente || "",
    codigoClienteOmie: atendimento.codigoClienteOmie?.toString() || "",
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
  const token = await getAuth().currentUser?.getIdToken();
  const response = await fetch(
    `${API_URL}/todosAtendimentos`,
    {
      headers: { "Authorization": `Bearer ${token}` }
    }
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
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

// Buscar ou criar cliente Omie pelo nome e telefone
export async function buscarClienteOmie(clientesFiltro: any) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");
  const token = await user.getIdToken();

  const response = await fetch(
    `${API_URL}/omie/buscarCliente`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ clientesFiltro }),
    }
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}


// Registrar atendimento

export async function registrarAtendimento(atendimentoData: any): Promise<string> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario não autenticado");
  const token = await user.getIdToken();

  const response = await fetch(
    `${API_URL}/registrarAtendimento`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(atendimentoData),
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao registrar atendimento: ${errorText}`);
  }
  const result = await response.json();
  return result.atendimentoId;
}