import { Timestamp } from "firebase/firestore";
import { type TipoServicoValue, type SubTipoServicoValue } from "./Servicos";
import type { SetorValue } from "./Setores";

export type StatusArte = "Iniciado" | "Em Aprovação" | "Concluído";

export interface EtapaInfo {
  atual: number;
  total: number;
}

export interface EtapasPedido {
  geral: EtapaInfo;
  arte?: EtapaInfo;
  galpao?: EtapaInfo;
}

export interface StatusArteHist {
  status: StatusArte;
  data: Timestamp;
  responsavel: string;
}

export type StatusGalpao =
  | "Iniciado"
  | "Aguardando Aprovação"
  | "Revisão Pendente"
  | "Aprovado"
  | "Corte e Preparação do Material"
  | "Montagem/Acabamento"
  | "Estrutura"
  | "Pintura"
  | "Elétrica"
  | "Montagem"
  | "Concluído";

export interface StatusGalpaoHist {
  status: StatusGalpao;
  data: Timestamp;
  responsavel: string;
}

export type StatusPedido =
  | "Iniciado"
  | "Aguardando Aprovação"
  | "Revisão Pendente"
  | "Aprovado"
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
  retrabalho?: boolean;
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
    arte?: Timestamp | null;
    producao?: Timestamp;
    entrega: Timestamp;
  };
  horarioRetirada?: string;
  tipoDeEntrega: "Entrega" | "Retirada" | "Instalação";
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  entregueEm?: Timestamp;
}
