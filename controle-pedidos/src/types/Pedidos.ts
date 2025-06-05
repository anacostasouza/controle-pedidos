import { Timestamp } from "firebase/firestore";
import { TipoServico, SubTipoServico, type TipoServicoValue, type SubTipoServicoValue } from "./Servicos";
import type { SetorValue } from './Setores';

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
  | "Corte e Preparação";

export interface Pedido {
  id?: string;
  pedidoID: number;
  numeroPedido: number;
  nomeCliente: string;
  servico: {
    tipo: TipoServicoValue;
    subTipo?: SubTipoServicoValue | null;
    servicoID: number;
  };
  responsavel: string;
  requerArte?: boolean;
  requerGalpao?: boolean;
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
}