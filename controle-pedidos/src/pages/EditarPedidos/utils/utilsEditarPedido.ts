/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../services/firebase";
import type {
  Pedido,
  StatusPedido,
  StatusArte,
  StatusGalpao,
  HistoricoStatusItem,
} from "../../../types/Pedidos";
import {
  TipoServico,
  SubTipoServico,
  TipoServicoLabels,
  SubTipoServicoLabels,
  type TipoServicoValue,
  type SubTipoServicoValue,
} from "../../../types/Servicos";
import {
  getStatusSequenceForPedido,
  STATUS_SEQUENCE_ARTE,
  STATUS_SEQUENCE_GALPAO,
} from "../../../types/StatusPedidos";
import type { PedidoUpdateData, UserInfo } from "../../../types/PedidoUpdates";

const getTipoServicoValueFromLabel = (
  label: string
): TipoServicoValue | undefined => {
  for (const key in TipoServicoLabels) {
    if (TipoServicoLabels[key as TipoServicoValue] === label) {
      return key as TipoServicoValue;
    }
  }
  return undefined;
};

const normalizeSubTipoServicoValue = (
  value: string
): SubTipoServicoValue | undefined => {
  for (const key in SubTipoServicoLabels) {
    if (SubTipoServicoLabels[key as SubTipoServicoValue] === value) {
      return key as SubTipoServicoValue;
    }
  }
  const upperCaseValue = value.toUpperCase();
  if (
    Object.values(SubTipoServico).includes(upperCaseValue as SubTipoServico)
  ) {
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
        if (ts instanceof Timestamp) return ts;
        if (
          ts &&
          typeof ts.seconds === "number" &&
          typeof ts.nanoseconds === "number"
        ) {
          return new Timestamp(ts.seconds, ts.nanoseconds);
        }
        return undefined;
      };

      const normalizedTipo =
        getTipoServicoValueFromLabel(data.servico.tipo as string) ??
        data.servico.tipo;
      const normalizedSubTipo = data.servico.subTipo
        ? normalizeSubTipoServicoValue(data.servico.subTipo as string)
        : undefined;

      return {
        id: docSnap.id,
        criadoEm: convertTimestamp(data.criadoEm)!,
        atualizadoEm: convertTimestamp(data.atualizadoEm)!,
        prazos: {
          entrega: convertTimestamp(data.prazos?.entrega),
          producao: convertTimestamp(data.prazos?.producao),
          arte: convertTimestamp(data.prazos?.arte),
        },
        entregueEm: convertTimestamp(data.entregueEm),
        horarioRetirada: data.horarioRetirada ?? undefined,
        historicoStatus: data.historicoStatus ?? [],
        StatusArte: data.StatusArte ?? [],
        StatusGalpao: data.StatusGalpao ?? [],
        servico: {
          tipo: normalizedTipo as TipoServicoValue,
          subTipo: normalizedSubTipo as SubTipoServicoValue,
          servicoID: data.servico.servicoID,
        },
        ...data,
      } as Pedido;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    return null;
  }
};

export const getStatusDisponiveis = (pedido: Pedido): StatusPedido[] => {
  return getStatusSequenceForPedido(
    pedido.servico.tipo,
    pedido.servico.subTipo
  );
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
  const {
    novoStatusGeral,
    novoStatusArte,
    novoStatusGalpao,
    novaDataEntrega,
    novoHorarioEntrega,
  } = updateData;

  let marcarComoEntregue = false;

  if (
    novoStatusGeral !== undefined &&
    novoStatusGeral !== pedidoAtual.statusAtual
  ) {
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
      updates.StatusArte = [
        ...(pedidoAtual.StatusArte || []),
        { status: "Concluído", data: now, responsavel: userDisplayName },
      ];
      updates.StatusGalpao = [
        ...(pedidoAtual.StatusGalpao || []),
        { status: "Concluído", data: now, responsavel: userDisplayName },
      ];
      // Lógica: se for serviço Arte, marcar como Entregue também
      if (pedidoAtual.servico.tipo === TipoServico.ARTE) {
        marcarComoEntregue = true;
      }
    }
  }

  if (
    (pedidoAtual.requerArte || pedidoAtual.servico.tipo === TipoServico.ARTE) &&
    novoStatusArte !== undefined
  ) {
    const ultimoStatusArte = pedidoAtual.StatusArte?.at(-1)?.status;
    if (novoStatusArte !== ultimoStatusArte) {
      const statusArteHistory = [...(pedidoAtual.StatusArte || [])];
      statusArteHistory.push({
        status: novoStatusArte,
        data: now,
        responsavel: userDisplayName,
      });
      updates.StatusArte = statusArteHistory;
    }
  }

  if (
    (pedidoAtual.requerGalpao ||
      pedidoAtual.servico.tipo === TipoServico.COMUNICACAO_VISUAL) &&
    novoStatusGalpao !== undefined
  ) {
    const ultimoStatusGalpao = pedidoAtual.StatusGalpao?.at(-1)?.status;
    if (novoStatusGalpao !== ultimoStatusGalpao) {
      const statusGalpaoHistory = [...(pedidoAtual.StatusGalpao || [])];
      statusGalpaoHistory.push({
        status: novoStatusGalpao,
        data: now,
        responsavel: userDisplayName,
      });
      updates.StatusGalpao = statusGalpaoHistory;
    }
  }

  const oldEntregaDateStr =
    pedidoAtual.prazos?.entrega?.toDate().toISOString().split("T")[0] || "";
  const oldHorarioEntregaStr = pedidoAtual.horarioRetirada ?? "";

  if (
    novaDataEntrega !== oldEntregaDateStr ||
    novoHorarioEntrega !== oldHorarioEntregaStr
  ) {
    if (novaDataEntrega && novoHorarioEntrega) {
      const [year, month, day] = novaDataEntrega.split("-").map(Number);
      const [hours, minutes] = novoHorarioEntrega.split(":").map(Number);
      const combinedDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      updates["prazos.entrega"] = Timestamp.fromDate(combinedDate);
      updates.horarioRetirada = novoHorarioEntrega;
    } else if (!novaDataEntrega && !novoHorarioEntrega) {
      updates["prazos.entrega"] = null;
      updates.horarioRetirada = null;
    } else {
      if (!novaDataEntrega) {
        updates["prazos.entrega"] = null;
      }
      if (!novoHorarioEntrega) {
        updates.horarioRetirada = null;
      }
    }
  }

  // Se for serviço Arte e foi concluído, marque como entregue também
  if (marcarComoEntregue) {
    updates.statusAtual = "Entregue";
    updates.entregueEm = now;
    updates.historicoStatus = [
      ...(updates.historicoStatus || pedidoAtual.historicoStatus || []),
      {
        status: "Entregue",
        data: now,
        responsavel: userDisplayName,
        setor: userSetor,
      },
    ];
  }

  try {
    await updateDoc(pedidoRef, updates);
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    throw error;
  }
};

export const montarUpdatesParaBackend = async (
  pedidoAtual: Pedido,
  userInfo: UserInfo,
  updateData: PedidoUpdateData
): Promise<Record<string, any>> => {
  const now = Timestamp.now();
  const { userSetor, userDisplayName } = userInfo;
  const {
    novoStatusGeral,
    novoStatusArte,
    novoStatusGalpao,
    novaDataEntrega,
    novoHorarioEntrega,
  } = updateData;

  let marcarComoEntregue = false;
  const updates: Record<string, any> = {
    atualizadoEm: now,
  };

  if (
    novoStatusGeral !== undefined &&
    novoStatusGeral !== pedidoAtual.statusAtual
  ) {
    const historicoStatus = [...(pedidoAtual.historicoStatus || [])];
    historicoStatus.push({
      status: novoStatusGeral,
      data: now,
      responsavel: userDisplayName,
      setor: userSetor,
    });
    updates.statusAtual = novoStatusGeral;
    updates.historicoStatus = historicoStatus;

    if (novoStatusGeral === "Concluído") {
      updates.StatusArte = [
        ...(pedidoAtual.StatusArte || []),
        { status: "Concluído", data: now, responsavel: userDisplayName },
      ];
      updates.StatusGalpao = [
        ...(pedidoAtual.StatusGalpao || []),
        { status: "Concluído", data: now, responsavel: userDisplayName },
      ];
      if (pedidoAtual.servico.tipo === "ARTE") {
        marcarComoEntregue = true;
      }
    }
  }

  if (
    (pedidoAtual.requerArte || pedidoAtual.servico.tipo === "ARTE") &&
    novoStatusArte !== undefined
  ) {
    const ultimoStatusArte = pedidoAtual.StatusArte?.at(-1)?.status;
    if (novoStatusArte !== ultimoStatusArte) {
      const statusArteHistory = [...(pedidoAtual.StatusArte || [])];
      statusArteHistory.push({
        status: novoStatusArte,
        data: now,
        responsavel: userDisplayName,
      });
      updates.StatusArte = statusArteHistory;
    }
  }

  if (
    (pedidoAtual.requerGalpao ||
      pedidoAtual.servico.tipo === "COMUNICACAO_VISUAL") &&
    novoStatusGalpao !== undefined
  ) {
    const ultimoStatusGalpao = pedidoAtual.StatusGalpao?.at(-1)?.status;
    if (novoStatusGalpao !== ultimoStatusGalpao) {
      const statusGalpaoHistory = [...(pedidoAtual.StatusGalpao || [])];
      statusGalpaoHistory.push({
        status: novoStatusGalpao,
        data: now,
        responsavel: userDisplayName,
      });
      updates.StatusGalpao = statusGalpaoHistory;
    }
  }

  const oldEntregaDateStr =
    pedidoAtual.prazos?.entrega?.toDate().toISOString().split("T")[0] || "";
  const oldHorarioEntregaStr = pedidoAtual.horarioRetirada ?? "";

  if (
    novaDataEntrega !== oldEntregaDateStr ||
    novoHorarioEntrega !== oldHorarioEntregaStr
  ) {
    if (novaDataEntrega && novoHorarioEntrega) {
      const [year, month, day] = novaDataEntrega.split("-").map(Number);
      const [hours, minutes] = novoHorarioEntrega.split(":").map(Number);
      const combinedDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
      updates["prazos"] = {
        ...pedidoAtual.prazos,
        entrega: Timestamp.fromDate(combinedDate),
      };
      updates.horarioRetirada = novoHorarioEntrega;
    } else if (!novaDataEntrega && !novoHorarioEntrega) {
      updates["prazos"] = { ...pedidoAtual.prazos, entrega: null };
      updates.horarioRetirada = null;
    } else {
      if (!novaDataEntrega) {
        updates["prazos"] = { ...pedidoAtual.prazos, entrega: null };
      }
      if (!novoHorarioEntrega) {
        updates.horarioRetirada = null;
      }
    }
  }

  if (marcarComoEntregue) {
    updates.statusAtual = "Entregue";
    updates.entregueEm = now;
    updates.historicoStatus = [
      ...(updates.historicoStatus || pedidoAtual.historicoStatus || []),
      {
        status: "Entregue",
        data: now,
        responsavel: userDisplayName,
        setor: userSetor,
      },
    ];
  }

  return updates;
};
