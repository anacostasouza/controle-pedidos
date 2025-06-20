import { Timestamp } from 'firebase/firestore';
import type { TipoServicoValue, SubTipoServicoValue } from './Servicos';

export type StatusPedido =
  | "Iniciado"
  | "Em Aprovação"
  | "Concluído"
  | "Impressão"
  | "Acabamento"
  | "Montagem"
  | "Pedido Feito"
  | "Liberado"
  | "Corte"
  | "Estrutura"
  | "Pintura"
  | "Elétrica"
  | "Corte e Preparação"
  | "Montagem/Acabamento"
  | "Entregue"; 

export const statusPorServico: Record<string, StatusPedido[] | Record<string, StatusPedido[]>> = {
  "ARTE": ["Iniciado", "Em Aprovação", "Concluído"],
  "GRAFICA_RAPIDA": {
    "IMPRESSAO_RAPIDA": ["Impressão", "Concluído"],
    "IMPRESSAO_COM_ACABAMENTO": ["Impressão", "Acabamento", "Concluído"],
    "CARIMBO": ["Impressão", "Montagem", "Concluído"],
    "ACABAMENTO": ["Acabamento", "Concluído"]
  },
  "IMPRESSAO_DIGITAL": ["Impressão", "Acabamento", "Concluído"],
  "COMUNICACAO_VISUAL": {
    "PLACA_SIMPLES": ["Corte e Preparação", "Montagem/Acabamento", "Concluído"],
    "PLACA_COMPLEXA": ["Corte", "Estrutura", "Pintura", "Elétrica", "Montagem", "Concluído"]
  },
  "TERCEIRIZADO": ["Pedido Feito", "Acabamento", "Liberado"]
};

export function getStatusSequenceForPedido(tipo: TipoServicoValue, subTipo?: SubTipoServicoValue): StatusPedido[] {
    const serviceStatuses = statusPorServico[tipo];

    if (typeof serviceStatuses === 'object' && !Array.isArray(serviceStatuses)) {
        if (subTipo && serviceStatuses[subTipo]) {
            return serviceStatuses[subTipo];
        }
        return Object.values(serviceStatuses)[0] || [];
    } else if (Array.isArray(serviceStatuses)) {
        return serviceStatuses;
    }
    return [];
}