/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Pedido, StatusArte, StatusGalpao } from "../types/Pedidos";
import { TipoServico, SubTipoServico } from "../types/Servicos";
import {
  getStatusSequenceForPedido as getStatusSequencePrincipal,
  STATUS_SEQUENCE_ARTE,       
  STATUS_SEQUENCE_GALPAO,     
  STATUS_SEQUENCE_DEFAULT     
} from "../types/StatusPedidos";

export const getStatusSequenceForPedido = (
  tipo: TipoServico,
  subTipo?: SubTipoServico | null
) => {
  const sequence = getStatusSequencePrincipal(tipo, subTipo);

  if (sequence.length === 0) {
    console.warn(`[getStatusUtils] Nenhuma sequência específica retornada por getStatusSequencePrincipal para Tipo: ${tipo}, SubTipo: ${subTipo}. Usando sequência padrão.`);
    return STATUS_SEQUENCE_DEFAULT;
  }
  return sequence;
};

const getCurrentStatusIndex = (
  currentStatus: string,
  sequence: string[]
): number => {
  const index = sequence.indexOf(currentStatus);
  return index === -1 ? 1 : index + 1; 
};

export const getTodasEtapasDoPedido = (pedido: Pedido) => {

  const etapasGeralSequence = getStatusSequenceForPedido(
    pedido.servico.tipo,
    pedido.servico.subTipo
  );
  const atualGeral = getCurrentStatusIndex(
    pedido.statusAtual,
    etapasGeralSequence
  );

  let etapasArteInfo = undefined;

  if (pedido.requerArte && pedido.servico.tipo !== TipoServico.ARTE) {
    const atualArte = getCurrentStatusIndex(
      pedido.StatusArte?.at(-1)?.status || "Iniciado",
      STATUS_SEQUENCE_ARTE
    );
    etapasArteInfo = {
      atual: atualArte,
      total: STATUS_SEQUENCE_ARTE.length,
    };
  }

  let etapasGalpaoInfo = undefined;

  if (pedido.requerGalpao && pedido.servico.tipo !== TipoServico.COMUNICACAO_VISUAL) {
    const atualGalpao = getCurrentStatusIndex(
      pedido.StatusGalpao?.at(-1)?.status || "Iniciado",
      STATUS_SEQUENCE_GALPAO
    );
    etapasGalpaoInfo = {
      atual: atualGalpao,
      total: STATUS_SEQUENCE_GALPAO.length,
    };
  }

  return {
    geral: {
      atual: atualGeral,
      total: etapasGeralSequence.length,
    },
    arte: etapasArteInfo,
    galpao: etapasGalpaoInfo,
  };
};