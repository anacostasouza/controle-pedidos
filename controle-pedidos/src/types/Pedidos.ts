import { Timestamp } from "firebase/firestore";
import type { TipoServico, SubTipoServico } from "./Servicos";
import type { Setores } from "./Setores";

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
    tipo: TipoServico;
    subTipo?: SubTipoServico;
    servicoID: number;
  };
  responsavel: string;
  requerArte?: boolean;
  requerGalpao?: boolean;
  setoresResponsaveis: Setores[];
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