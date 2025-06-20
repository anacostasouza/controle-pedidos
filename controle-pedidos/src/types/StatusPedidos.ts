/* eslint-disable @typescript-eslint/no-unused-vars */
import { Timestamp } from 'firebase/firestore'; 
import { TipoServico, SubTipoServico, type TipoServicoValue, type SubTipoServicoValue } from './Servicos';
import type { StatusPedido, StatusArte, StatusGalpao } from './Pedidos';

export const STATUS_SEQUENCE_ARTE_PRINCIPAL: StatusPedido[] = ["Iniciado", "Em Aprovação", "Concluído"];
export const STATUS_SEQUENCE_GRAFICA_RAPIDA_IMPRESSAO_RAPIDA: StatusPedido[] = ["Iniciado", "Impressão", "Concluído"];
export const STATUS_SEQUENCE_GRAFICA_RAPIDA_IMPRESSAO_COM_ACABAMENTO: StatusPedido[] = ["Iniciado", "Impressão", "Acabamento", "Concluído"];
export const STATUS_SEQUENCE_GRAFICA_RAPIDA_CARIMBO: StatusPedido[] = ["Iniciado", "Impressão", "Montagem", "Concluído"];
export const STATUS_SEQUENCE_GRAFICA_RAPIDA_ACABAMENTO: StatusPedido[] = ["Iniciado", "Acabamento", "Concluído"];
export const STATUS_SEQUENCE_IMPRESSAO_DIGITAL: StatusPedido[] = ["Iniciado", "Impressão", "Acabamento", "Concluído"];
export const STATUS_SEQUENCE_COMUNICACAO_VISUAL_PLACA_SIMPLES: StatusPedido[] = [
  "Iniciado",
  "Corte e Preparação do Material",
  "Montagem/Acabamento",
  "Concluído"
];
export const STATUS_SEQUENCE_COMUNICACAO_VISUAL_PLACA_COMPLEXA: StatusPedido[] = ["Iniciado", "Corte", "Estrutura", "Pintura", "Elétrica", "Montagem", "Concluído"];
export const STATUS_SEQUENCE_TERCEIRIZADO: StatusPedido[] = ["Iniciado", "Pedido Feito", "Acabamento", "Liberado", "Concluído"];
export const STATUS_SEQUENCE_DEFAULT: StatusPedido[] = ["Iniciado", "Concluído"];

export const STATUS_SEQUENCE_ARTE: StatusArte[] = ["Iniciado", "Em Aprovação", "Concluído"];
export const STATUS_SEQUENCE_GALPAO: StatusGalpao[] = [
  "Iniciado",
  "Corte e Preparação do Material",
  "Montagem/Acabamento",
  "Estrutura",
  "Pintura",
  "Elétrica",
  "Montagem",
  "Concluído"
];

export const statusPorServico: Record<string, StatusPedido[] | Record<string, StatusPedido[]>> = {
  [TipoServico.ARTE]: STATUS_SEQUENCE_ARTE_PRINCIPAL,
  [TipoServico.GRAFICA_RAPIDA]: {
    [SubTipoServico.IMPRESSAO_RAPIDA]: STATUS_SEQUENCE_GRAFICA_RAPIDA_IMPRESSAO_RAPIDA,
    [SubTipoServico.IMPRESSAO_COM_ACABAMENTO]: STATUS_SEQUENCE_GRAFICA_RAPIDA_IMPRESSAO_COM_ACABAMENTO,
    [SubTipoServico.CARIMBO]: STATUS_SEQUENCE_GRAFICA_RAPIDA_CARIMBO,
    [SubTipoServico.ACABAMENTO]: STATUS_SEQUENCE_GRAFICA_RAPIDA_ACABAMENTO
  },
  [TipoServico.IMPRESSAO_DIGITAL]: STATUS_SEQUENCE_IMPRESSAO_DIGITAL,
  [TipoServico.COMUNICACAO_VISUAL]: {
    [SubTipoServico.PLACA_SIMPLES]: STATUS_SEQUENCE_COMUNICACAO_VISUAL_PLACA_SIMPLES,
    [SubTipoServico.PLACA_COMPLEXA]: STATUS_SEQUENCE_COMUNICACAO_VISUAL_PLACA_COMPLEXA
  },
  [TipoServico.TERCEIRIZADO]: STATUS_SEQUENCE_TERCEIRIZADO
};

export function getStatusSequenceForPedido(tipo: TipoServicoValue, subTipo?: SubTipoServicoValue | null): StatusPedido[] {
  const serviceStatuses = statusPorServico[tipo];

  if (typeof serviceStatuses === 'object' && !Array.isArray(serviceStatuses)) {
    if (subTipo && serviceStatuses[subTipo]) {
      return serviceStatuses[subTipo];
    } else {
      console.warn(`[StatusPedidos] SubTipo "${subTipo}" não encontrado para TipoServico "${tipo}". Retornando sequência padrão.`);
      return STATUS_SEQUENCE_DEFAULT; 
    }
  } else if (Array.isArray(serviceStatuses)) {
    return serviceStatuses;
  } else {
    console.warn(`[StatusPedidos] TipoServico "${tipo}" não encontrado ou mal formatado em statusPorServico. Retornando sequência padrão.`);
    return STATUS_SEQUENCE_DEFAULT; 
  }
}