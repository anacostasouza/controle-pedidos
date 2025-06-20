/* eslint-disable @typescript-eslint/no-unused-vars */
import { Timestamp } from "firebase/firestore";
import { TipoServico, SubTipoServico, type TipoServicoValue, type SubTipoServicoValue } from './Servicos';
import type { SetorValue } from './Setores';

export type StatusArte = "Iniciado" | "Em Aprovação" | "Concluído";
export interface StatusArteHist {
  status: StatusArte;
  data: Timestamp;
  responsavel: string;
}

export type StatusGalpao =
  | "Iniciado"
  | "Corte e Preparação do Material"
  | "Montagem/Acabamento"
  | "Estrutura"
  | "Pintura"
  | "Elétrica"
  | "Montagem"
  | "Concluído";

export interface StatusGalpaoHist {
  status: StatusGalpao
  data: Timestamp;
  responsavel: string;
}

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
  | "Corte e Preparação do Material"
  | "Montagem/Acabamento" 
  | "Entregue"; 

export interface HistoricoStatusItem {
  status: StatusPedido;
  data: Timestamp;
  responsavel: string;
  setor: string;
}

export interface Pedido {
  id?: string;
  pedidoID: number;
  numeroPedido: number;
  nomeCliente: string;
  servico: {
    tipo: TipoServicoValue;
    subTipo?: SubTipoServicoValue;
    servicoID: number;
  };
  responsavel: string;
  requerArte?: boolean;
  StatusArte?: StatusArteHist[];
  requerGalpao?: boolean;
  StatusGalpao?: StatusGalpaoHist[];
  setoresResponsaveis: SetorValue[];
  statusAtual: StatusPedido;
  historicoStatus: Array<{
    status: StatusPedido;
    data: Timestamp;
    responsavel: string;
    setor: string;
  }>;
  prazos: {
    arte?: Timestamp;
    producao?: Timestamp;
    entrega: Timestamp;
  };
  horarioRetirada?: string;
  tipoDeEntrega: 'Entrega' | 'Retirada' | 'Instalação';
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  entregueEm?: Timestamp; 
}