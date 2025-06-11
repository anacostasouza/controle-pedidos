import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  type DocumentData
} from "firebase/firestore";
import { db } from "../services/firebase";
import type { Pedido, StatusArteHist, StatusGalpaoHist, StatusPedido } from "../types/Pedidos";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TipoServicoLabels, type SubTipoServicoValue, type TipoServicoValue } from "../types/Servicos";
import { statusPorServico } from '../types/StatusPedidos';
import type { StatusArte, StatusArteHist, StatusGalpao } from "../utils/statusUtils"
import type { SetorValue } from "../types/Setores";

export async function fetchPedidoById(id: string): Promise<Pedido | null> {
  const docRef = doc(db, "pedidos", id);
  const pedidoSnap = await getDoc(docRef);
  if (pedidoSnap.exists()) {
    const data = pedidoSnap.data() as DocumentData;
    return {
      ...data,
      dataCadastro: data.dataCadastro?.toDate?.() ?? new Date(),
      historicoStatus: data.historicoStatus ?? [],
      statusAtual: data.statusAtual,
    } as unknown as Pedido;
  }
  return null;
}

export async function atualizarStatusPedido(
  id: string,
  pedido: Pedido,
  novoStatus: StatusPedido,
  userSetor: string,
  novoStatusArte?: StatusArte,
  novoStatusGalpao?: StatusGalpao
) {
  const pedidoRef = doc(db, "pedidos", id);

  const updates: Partial<Pedido> = {
    statusAtual: novoStatus,
    historicoStatus: [
      ...(pedido.historicoStatus || []),
      {
        status: novoStatus,
        data: Timestamp.now(),
        responsavel: userSetor,
        setor: ""
      }
    ]
  };

  if (
    pedido.requerArte &&
    novoStatusArte &&
    novoStatusArte !== (pedido.StatusArte?.[pedido.StatusArte.length - 1]?.status)
  ) {
    updates.StatusArte = [
      ...(pedido.StatusArte || []),
      {
        status: novoStatusArte as StatusArte,
        data: Timestamp.now(),
        responsavel: userSetor
      }
    ];
  }

  if (
    pedido.requerGalpao &&
    novoStatusGalpao &&
    novoStatusGalpao !== (pedido.StatusGalpao?.[pedido.StatusGalpao.length - 1]?.status)
  ) {
    updates.StatusGalpao = [
      ...(pedido.StatusGalpao || []),
      {
        status: novoStatusGalpao as StatusGalpao,
        data: Timestamp.now(),
        responsavel: userSetor
      }
    ];
  }

  await updateDoc(pedidoRef, updates);
}

export async function deletarPedidoPorId(id: string): Promise<void> {
  await deleteDoc(doc(db, "pedidos", id));
}

export function getStatusDisponiveis(pedido: Pedido): StatusPedido[] {
  const tipoLabel = TipoServicoLabels[pedido.servico.tipo];
  const subTipoLabel = pedido.servico.subTipo;

  const statusEntry = statusPorServico[tipoLabel];

  if (
    typeof statusEntry === "object" && 
    !Array.isArray(statusEntry) &&
    subTipoLabel
  ) {
    return statusEntry[subTipoLabel] ?? [];
  }

  return Array.isArray(statusEntry) ? statusEntry : [];

}

export function getStatusArteDisponiveis(pedido?: Pedido): StatusArte[] {
  return ["Iniciado", "Em Aprovação", "Concluído"];
}

export function getStatusGalpaoDisponiveis(pedido?: Pedido): StatusGalpao[] {
  return ["Corte e Preparação do Material", "Elétrica", "Estrutura", "Montagem/Acabamento", "Pintura", "Concluído"]
}