// utils/utilsEditarPedido.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import type { Pedido, StatusPedido, StatusArte, StatusGalpao, HistoricoStatusItem } from "../types/Pedidos";

import { TipoServico, SubTipoServico, TipoServicoLabels, SubTipoServicoLabels, type TipoServicoValue, type SubTipoServicoValue } from "../types/Servicos";
import { getStatusSequenceForPedido, STATUS_SEQUENCE_ARTE, STATUS_SEQUENCE_GALPAO } from "../types/StatusPedidos";
import type { SetorValue } from "../types/Setores";

// IMPORTAR OS NOVOS TIPOS
import type { PedidoUpdateData, UserInfo } from "../types/PedidoUpdates"; // Ajuste o caminho conforme onde você salvou

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

      const normalizedTipo = getTipoServicoValueFromLabel(data.servico.tipo as string) ?? data.servico.tipo;
      const normalizedSubTipo = data.servico.subTipo
        ? normalizeSubTipoServicoValue(data.servico.subTipo as string)
        : undefined;

      return {
        id: docSnap.id,
        criadoEm: convertTimestamp(data.criadoEm)!,
        atualizadoEm: convertTimestamp(data.atualizadoEm)!,
        prazos: {
          entrega: convertTimestamp(data.prazos?.entrega), // Pode ser undefined
          producao: convertTimestamp(data.prazos?.producao),
          arte: convertTimestamp(data.prazos?.arte),
        },
        entregueEm: convertTimestamp(data.entregueEm),
        horarioRetirada: data.horarioRetirada ?? undefined, // Adicionado para carregar o horário
        historicoStatus: data.historicoStatus ?? [],
        StatusArte: data.StatusArte ?? [],
        StatusGalpao: data.StatusGalpao ?? [],
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

export const atualizarPedidoCompleto = async (
  id: string,
  pedidoAtual: Pedido,
  userInfo: UserInfo,
  updateData: PedidoUpdateData
): Promise<void> => {
  const pedidoRef = doc(db, "pedidos", id);
  const now = Timestamp.now();
  const updates: Record<string, any> = {
    atualizadoEm: now,
  };

  const { userSetor, userDisplayName } = userInfo;
  const { novoStatusGeral, novoStatusArte, novoStatusGalpao, novaDataEntrega, novoHorarioEntrega } = updateData;


  // --- Lógica para atualizar o status principal ---
  if (novoStatusGeral !== undefined && novoStatusGeral !== pedidoAtual.statusAtual) {
    const historicoStatus = [...(pedidoAtual.historicoStatus || [])];
    historicoStatus.push({
      status: novoStatusGeral,
      data: now,
      responsavel: userDisplayName,
      setor: userSetor,
    } as HistoricoStatusItem);
    updates.statusAtual = novoStatusGeral;
    updates.historicoStatus = historicoStatus;

    if (novoStatusGeral === "Concluído") {
      updates.StatusArte = [...(pedidoAtual.StatusArte || []), { status: "Concluído", data: now, responsavel: userDisplayName }];
      updates.StatusGalpao = [...(pedidoAtual.StatusGalpao || []), { status: "Concluído", data: now, responsavel: userDisplayName }];
    }
  }

  // --- Lógica para atualizar o status da arte ---
  if ((pedidoAtual.requerArte || pedidoAtual.servico.tipo === TipoServico.ARTE) && novoStatusArte !== undefined) {
    const ultimoStatusArte = pedidoAtual.StatusArte?.at(-1)?.status;
    if (novoStatusArte !== ultimoStatusArte) {
      const statusArteHistory = [...(pedidoAtual.StatusArte || [])];
      statusArteHistory.push({ status: novoStatusArte, data: now, responsavel: userDisplayName });
      updates.StatusArte = statusArteHistory;
    }
  } else if (!pedidoAtual.requerArte && pedidoAtual.servico.tipo !== TipoServico.ARTE && updates.StatusArte === undefined) {
    // Garante que StatusArte não seja adicionado se não for necessário
  }

  // --- Lógica para atualizar o status do galpão ---
  if ((pedidoAtual.requerGalpao || pedidoAtual.servico.tipo === TipoServico.COMUNICACAO_VISUAL) && novoStatusGalpao !== undefined) {
    const ultimoStatusGalpao = pedidoAtual.StatusGalpao?.at(-1)?.status;
    if (novoStatusGalpao !== ultimoStatusGalpao) {
      const statusGalpaoHistory = [...(pedidoAtual.StatusGalpao || [])];
      statusGalpaoHistory.push({ status: novoStatusGalpao, data: now, responsavel: userDisplayName});
      updates.StatusGalpao = statusGalpaoHistory;
    }
  } else if (!pedidoAtual.requerGalpao && pedidoAtual.servico.tipo !== TipoServico.COMUNICACAO_VISUAL && updates.StatusGalpao === undefined) {
    // Garante que StatusGalpao não seja adicionado se não for necessário
  }

  // --- Lógica para atualizar o prazo de entrega e horário ---
  // Normaliza os valores antigos para comparação
  const oldEntregaDateStr = pedidoAtual.prazos?.entrega?.toDate().toISOString().split("T")[0] || ""; // "" se não houver data
  const oldHorarioEntregaStr = pedidoAtual.horarioRetirada || ""; // "" se não houver horário

  // Verifica se houve qualquer alteração na data OU no horário
  if (novaDataEntrega !== oldEntregaDateStr || novoHorarioEntrega !== oldHorarioEntregaStr) {
    if (novaDataEntrega && novoHorarioEntrega) {
      const [year, month, day] = novaDataEntrega.split('-').map(Number);
      const [hours, minutes] = novoHorarioEntrega.split(":").map(Number);

      // CRÍTICO: Criar a data no fuso horário LOCAL para evitar deslocamento ao salvar/ler.
      // O mês no construtor de Date é 0-indexed (janeiro = 0, dezembro = 11).
      const combinedDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

      updates['prazos.entrega'] = Timestamp.fromDate(combinedDate);
      updates.horarioRetirada = novoHorarioEntrega;

    } else if (!novaDataEntrega && !novoHorarioEntrega) {
      // Se ambos novaDataEntrega e novoHorarioEntrega estão vazios, define como null para remover (ou apagar) no Firestore
      updates['prazos.entrega'] = null;
      updates.horarioRetirada = null;
    } else {
      // Se um está vazio e o outro não (e já passou pela validação no front-end)
      // Isso pode significar que o usuário limpou apenas um campo.
      if (!novaDataEntrega) {
          updates['prazos.entrega'] = null;
      }
      if (!novoHorarioEntrega) {
          updates.horarioRetirada = null;
      }
    }
  }

  try {
    await updateDoc(pedidoRef, updates);
    console.log("Pedido atualizado com sucesso!", updates);
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    throw error;
  }
};