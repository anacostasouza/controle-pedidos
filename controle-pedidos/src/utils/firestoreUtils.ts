/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "../services/firebase";
import { getAuth } from 'firebase/auth';
import {
  collection,
  doc,
  query,
  where,
  getDoc,
  getDocs,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
  updateDoc,
  setDoc
} from "firebase/firestore";
import type {
  Pedido,
  EtapasPedido,
  EtapaInfo,
  StatusPedido,
} from "../types/Pedidos";

// -------------------- GetAuth para Tokers ---------------

export async function atualizarPedido(pedidoId: string, novoStatus: string, userSetor: string, userDisplayName: string) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");

  const token = await user.getIdToken();

  const response = await fetch("/api/atualizarPedido", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ pedidoId, novoStatus, userSetor, userDisplayName }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro desconhecido");

  return data;
}


// ---------------------- Helpers ----------------------

function arrayify(val: unknown): string[] {
  return Array.isArray(val) ? (val as string[]) : [];
}

function readSequenceField(data: DocumentData): string[] {
  return (
    arrayify((data as any)?.sequenciaStatus) ||
    arrayify((data as any)?.statusSequence) ||
    []
  );
}

function normalizeStatus(s?: string | null): string {
  if (!s) return "";
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function indexInSequence(sequence: string[], value?: string | null): number {
  if (!sequence?.length || !value) return -1;
  const target = normalizeStatus(value);
  const normalized = sequence.map((s) => normalizeStatus(s));
  return normalized.findIndex((s) => s === target);
}

// ---------------------- Equivalência específica por serviço ----------------------

const STATUS_EQUIVALENCE_BY_SERVICE: Record<string, Record<string, string>> = {
  IMPRESSAO_DIGITAL: { iniciado: "Aguardando Aprovação" },
  GRAFICA_RAPIDA_CARIMBO: { iniciado: "Aguardando Aprovação" },
  "GRAFICA_RAPIDA|CARIMBO": { iniciado: "Aguardando Aprovação" },
  COMUNICACAO_VISUAL_PLACA_COMPLEXA: { iniciado: "Aguardando Aprovação" },
  COMUNICACAO_VISUAL: { iniciado: "Aguardando Aprovação" },
  TERCEIRIZADO: { incluído: "Iniciado" },
};

export function mapStatusWithEquivalence(
  status: string | undefined | null,
  tipo: string,
  subTipo?: string
): StatusPedido | undefined {
  if (!status) return undefined;
  const normalizedStatus = status.toLowerCase().trim();

  const keySubtipo = `${tipo}|${subTipo ?? ""}`;
  const mappingSubtipo = STATUS_EQUIVALENCE_BY_SERVICE[keySubtipo];
  if (mappingSubtipo?.[normalizedStatus])
    return mappingSubtipo[normalizedStatus] as StatusPedido;

  const keyTipo = `${tipo}|`;
  const mappingTipo = STATUS_EQUIVALENCE_BY_SERVICE[keyTipo];
  if (mappingTipo?.[normalizedStatus])
    return mappingTipo[normalizedStatus] as StatusPedido;

  const mappingServico = STATUS_EQUIVALENCE_BY_SERVICE[tipo];
  if (mappingServico?.[normalizedStatus])
    return mappingServico[normalizedStatus] as StatusPedido;

  return status as StatusPedido;
}

// ---------------------- Listeners em tempo real ----------------------

export function listenPedido(
  pedidoId: string,
  callback: (pedido: Pedido | null) => void
): Unsubscribe {
  const ref = doc(db, "pedidos", pedidoId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() } as Pedido);
    else callback(null);
  });
}

export function listenStatusSequence(
  tipo: string,
  subTipo: string | undefined,
  callback: (seq: StatusPedido[]) => void
): Unsubscribe {
  const directRef = doc(db, "servicosStatus", tipo);

  const unsubscribeDirect = onSnapshot(directRef, (snap) => {
    if (snap.exists()) {
      const seq = readSequenceField(snap.data());
      if (seq.length) callback(seq as StatusPedido[]);
    }
  });

  const servicosRef = collection(db, "servicosStatus");
  const constraints = [where("tipo", "==", tipo)];
  if (subTipo && subTipo !== "") constraints.push(where("subTipo", "==", subTipo));
  const q = query(servicosRef, ...constraints);

  const unsubscribeQuery = onSnapshot(q, (snap) => {
    if (!snap.empty) {
      const data = snap.docs[0].data();
      const seq = readSequenceField(data);
      callback(seq as StatusPedido[]);
    }
  });

  return () => {
    unsubscribeDirect();
    unsubscribeQuery();
  };
}

// ---------------------- Fetch único ----------------------

export async function fetchPedidoById(
  pedidoId: string
): Promise<Pedido | null> {
  const ref = doc(db, "pedidos", pedidoId);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Pedido) : null;
}

const statusSequenceCache = new Map<string, StatusPedido[]>();

const getStatusSequenceCacheKey = (tipo: string, subTipo?: string): string =>
  `${tipo}::${subTipo ?? ""}`;

export async function fetchStatusSequence(
  tipo: string,
  subTipo?: string
): Promise<StatusPedido[]> {
  const cacheKey = getStatusSequenceCacheKey(tipo, subTipo);
  const cachedSequence = statusSequenceCache.get(cacheKey);
  if (cachedSequence) {
    return cachedSequence;
  }

  try {
    const directRef = doc(db, "servicosStatus", tipo);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      const seq = readSequenceField(directSnap.data());
      if (seq.length) {
        const normalizedSequence = seq as StatusPedido[];
        statusSequenceCache.set(cacheKey, normalizedSequence);
        return normalizedSequence;
      }
    }

    const servicosRef = collection(db, "servicosStatus");
    const constraints = [where("tipo", "==", tipo)];
    if (subTipo && subTipo !== "") constraints.push(where("subTipo", "==", subTipo));
    const q = query(servicosRef, ...constraints);
    const snap = await getDocs(q);

    if (snap.empty) {
      statusSequenceCache.set(cacheKey, []);
      return [];
    }
    const data = snap.docs[0].data();
    const seq = readSequenceField(data);
    const normalizedSequence = seq as StatusPedido[];
    statusSequenceCache.set(cacheKey, normalizedSequence);
    return normalizedSequence;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error("Erro ao buscar sequência de status:", err);
    }
    statusSequenceCache.set(cacheKey, []);
    return [];
  }
}

// ---------------------- Atualizar pedido ----------------------

export async function updatePedido(
  pedidoId: string,
  data: Partial<Pedido>
): Promise<void> {
  const ref = doc(db, "pedidos", pedidoId);
  await updateDoc(ref, data as any);
}

// ---------------------- Criar/atualizar sequência ----------------------

export async function setStatusSequence(
  servico: string,
  subtipo: string | null,
  statusSequence: StatusPedido[]
) {
  const ref = doc(db, "servicosStatus", servico);
  await setDoc(
    ref,
    {
      tipo: servico,
      subTipo: subtipo ?? null,
      sequenciaStatus: statusSequence,
    },
    { merge: true }
  );
}

// ---------------------- Listagem de serviços ----------------------

export interface ServicoStatus {
  id: string;
  tipo: string;
  subTipo?: string | null;
  sequenciaStatus: string[];
}

export async function fetchAllServicosStatus(): Promise<ServicoStatus[]> {
  const snapshot = await getDocs(collection(db, "servicosStatus"));
  const servicos: ServicoStatus[] = snapshot.docs.map((docu) => ({
    id: docu.id,
    ...(docu.data() as Omit<ServicoStatus, "id">),
  }));

  return servicos.sort((a, b) =>
    (a.tipo || "").toLowerCase().localeCompare((b.tipo || "").toLowerCase())
  );
}

// ---------------------- Função de etapas ----------------------

export async function getTodasEtapasDoPedido(
  pedido: Pedido
): Promise<EtapasPedido> {
  const geralSequence: StatusPedido[] = await fetchStatusSequence(
    pedido.servico.tipo,
    pedido.servico.subTipo ?? undefined
  );

  const statusGeral = mapStatusWithEquivalence(
    pedido.statusAtual,
    pedido.servico.tipo,
    pedido.servico.subTipo
  );
  const atualGeralIndex = statusGeral
    ? indexInSequence(geralSequence as string[], statusGeral)
    : -1;

  const etapasGeral: EtapaInfo = {
    atual: atualGeralIndex >= 0 ? atualGeralIndex + 1 : 0,
    total: geralSequence.length,
  };

  let etapasArte: EtapaInfo | undefined;
  if (pedido.requerArte) {
    const statusArteSequence = await fetchStatusSequence("ARTE");
    const ultimoStatusArte = pedido.StatusArte?.at(-1);
    const statusArte = mapStatusWithEquivalence(
      ultimoStatusArte?.status,
      pedido.servico.tipo,
      pedido.servico.subTipo
    );
    const indexArte = statusArte
      ? indexInSequence(statusArteSequence as string[], statusArte)
      : 0;
    etapasArte = { atual: indexArte + 1, total: statusArteSequence.length };
  }

  let etapasGalpao: EtapaInfo | undefined;
  if (pedido.requerGalpao) {
    const statusGalpaoSequence = await fetchStatusSequence(
      "GALPAO",
      pedido.servico.subTipo ?? undefined
    );
    const ultimoStatusGalpao = pedido.StatusGalpao?.at(-1);
    const statusGalpao = mapStatusWithEquivalence(
      ultimoStatusGalpao?.status,
      pedido.servico.tipo,
      pedido.servico.subTipo
    );
    const indexGalpao = statusGalpao
      ? indexInSequence(statusGalpaoSequence as string[], statusGalpao)
      : 0;
    etapasGalpao = {
      atual: indexGalpao + 1,
      total: statusGalpaoSequence.length,
    };
  }

  return { geral: etapasGeral, arte: etapasArte, galpao: etapasGalpao };
}
