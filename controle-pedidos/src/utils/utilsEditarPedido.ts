/* eslint-disable @typescript-eslint/no-explicit-any */
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import type { Pedido, StatusPedido, StatusArte, StatusGalpao, HistoricoStatusItem } from "../types/Pedidos";

import { TipoServico, SubTipoServico, TipoServicoLabels, SubTipoServicoLabels, type TipoServicoValue, type SubTipoServicoValue } from "../types/Servicos";
import { getStatusSequenceForPedido, STATUS_SEQUENCE_ARTE, STATUS_SEQUENCE_GALPAO } from "../types/StatusPedidos";
import type { SetorValue } from "../types/Setores";

const getTipoServicoValueFromLabel = (label: string): TipoServicoValue | undefined => {
  for (const key in TipoServicoLabels) {
    if (TipoServicoLabels[key as TipoServicoValue] === label) {
      return key as TipoServicoValue;
    }
  }
  return undefined;
};

const normalizeSubTipoServicoValue = (value: string): SubTipoServicoValue | undefined => {
  for (const key in SubTipoServicoLabels) {
    if (SubTipoServicoLabels[key as SubTipoServicoValue] === value) {
      return key as SubTipoServicoValue;
    }
  }
  const upperCaseValue = value.toUpperCase();
  if (Object.values(SubTipoServico).includes(upperCaseValue as SubTipoServico)) {
    return upperCaseValue as SubTipoServicoValue;
  }
  return undefined;
};

export const fetchPedidoById = async (id: string): Promise<Pedido | null> => {
  try {
    const docRef = doc(db, "pedidos", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      const convertTimestamp = (ts: any) => {
        if (ts instanceof Timestamp) {
          return ts;
        }
        if (ts && typeof ts.seconds === 'number' && typeof ts.nanoseconds === 'number') {
          return new Timestamp(ts.seconds, ts.nanoseconds);
        }
        return undefined;
      };

      const normalizedTipo = getTipoServicoValueFromLabel(data.servico.tipo as string) || data.servico.tipo;
      const normalizedSubTipo = data.servico.subTipo
        ? normalizeSubTipoServicoValue(data.servico.subTipo as string)
        : undefined;

      return {
        id: docSnap.id,
        criadoEm: convertTimestamp(data.criadoEm)!,
        atualizadoEm: convertTimestamp(data.atualizadoEm)!,
        prazos: {
          entrega: convertTimestamp(data.prazos?.entrega)!,
          producao: convertTimestamp(data.prazos?.producao),
          arte: convertTimestamp(data.prazos?.arte),
        },
        entregueEm: convertTimestamp(data.entregueEm),
        historicoStatus: data.historicoStatus || [],
        StatusArte: data.StatusArte || [],
        StatusGalpao: data.StatusGalpao || [],
        servico: {
          tipo: normalizedTipo as TipoServicoValue,
          subTipo: normalizedSubTipo as SubTipoServicoValue,
          servicoID: data.servico.servicoID,
        },
        ...data 
      } as Pedido; 
    } else {
      console.log("Nenhum pedido encontrado com o ID:", id);
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    return null;
  }
};

export const deletarPedidoPorId = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "pedidos", id));
    console.log("Pedido deletado com sucesso:", id);
  } catch (error) {
    console.error("Erro ao deletar pedido:", error);
    throw error;
  }
};

export const getStatusDisponiveis = (pedido: Pedido): StatusPedido[] => {
  return getStatusSequenceForPedido(pedido.servico.tipo, pedido.servico.subTipo);
};

export const getStatusArteDisponiveis = (): StatusArte[] => {
  return STATUS_SEQUENCE_ARTE;
};

export const getStatusGalpaoDisponiveis = (): StatusGalpao[] => {
  return STATUS_SEQUENCE_GALPAO;
};

export const atualizarStatusPedido = async (
  id: string,
  pedidoAtual: Pedido,
  novoStatusGeral: StatusPedido,
  userSetor: SetorValue,
  userDisplayName: string,
  novoStatusArte?: StatusArte,
  novoStatusGalpao?: StatusGalpao
): Promise<void> => {
  const pedidoRef = doc(db, "pedidos", id);
  const now = Timestamp.now();
  const updates: any = {
    atualizadoEm: now,
  };

  if (novoStatusGeral && novoStatusGeral !== pedidoAtual.statusAtual) {
    updates.statusAtual = novoStatusGeral;
    updates.historicoStatus = [
      ...(pedidoAtual.historicoStatus || []),
      {
        status: novoStatusGeral,
        data: now,
        responsavel: userDisplayName,
        setor: userSetor,
      } as HistoricoStatusItem,
    ];
    if (novoStatusGeral === "Concluído") {
        updates.StatusArte = [...(pedidoAtual.StatusArte || []), { status: "Concluído", data: now, responsavel: userDisplayName }];
        updates.StatusGalpao = [...(pedidoAtual.StatusGalpao || []), { status: "Concluído", data: now, responsavel: userDisplayName }];
    }
  }

  if (pedidoAtual.requerArte || pedidoAtual.servico.tipo === TipoServico.ARTE) {
    const ultimoStatusArte = pedidoAtual.StatusArte?.at(-1)?.status;
    if (novoStatusArte && novoStatusArte !== ultimoStatusArte) {
      updates.StatusArte = [
        ...(pedidoAtual.StatusArte || []),
        { status: novoStatusArte, data: now, responsavel: userDisplayName },
      ];
    }
  }

  if (pedidoAtual.requerGalpao || pedidoAtual.servico.tipo === TipoServico.COMUNICACAO_VISUAL) {
    const ultimoStatusGalpao = pedidoAtual.StatusGalpao?.at(-1)?.status;
    if (novoStatusGalpao && novoStatusGalpao !== ultimoStatusGalpao) {
      updates.StatusGalpao = [
        ...(pedidoAtual.StatusGalpao || []),
        { status: novoStatusGalpao, data: now, responsavel: userDisplayName },
      ];
    }
  }

  try {
    await updateDoc(pedidoRef, updates);
    console.log("Status do pedido atualizado com sucesso!", updates);
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    throw error;
  }
};