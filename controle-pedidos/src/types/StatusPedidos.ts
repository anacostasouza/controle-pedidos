import { Timestamp } from 'firebase/firestore';
import type { TipoServicoValue, SubTipoServicoValue } from './Servicos';

export type StatusPedido =
  | "Iniciado"
  | "Em Aprovação"
  | "Concluído"
  | "Impressão"
  | "Acabamento"
  | "Montagem"
  | "Montagem/Acabamento"
  | "Pedido Feito"
  | "Liberado"
  | "Corte"
  | "Estrutura"
  | "Pintura"
  | "Elétrica"
  | "Montagem"
  | "Corte e Preparação"
  | "Montagem/Acabamento"
  | "Montagem"
  | "Montagem/Acabamento";

/* export interface FiltrosPedidos {
    status?: StatusPedido;
    dataInicio?: Timestamp;
    dataFim?: Timestamp;
    Servicos?: Servicos;
    subServicos?: string;
    responsavel?: string;
    tipoDeEntrega?: string;
    arte?: boolean;
    galpao?: boolean;
    numeroPedido?: number;
} */

export const statusPorServico: Record<string, StatusPedido[] | Record<string, StatusPedido[]>> = {
  "Arte": ["Iniciado", "Em Aprovação", "Concluído"],
  "Gráfica Rápida": {
    "Impressão Rápida": ["Impressão", "Concluído"],
    "Impressão com Acabamento": ["Impressão", "Acabamento", "Concluído"],
    "Carimbo": ["Impressão", "Montagem", "Concluído"],
    "Acabamento": ["Acabamento", "Concluído"]
  },
  "Impressão Digital": ["Impressão", "Acabamento", "Concluído"],
  "Comunicação Visual": {
    "Placa Simples": ["Corte e Preparação", "Montagem/Acabamento", "Concluído"],
    "Placa Complexa": ["Corte", "Estrutura", "Pintura", "Elétrica", "Montagem", "Concluído"]
  },
  "Terceirizado": ["Pedido Feito", "Acabamento", "Liberado"]
  
};
