import { Timestamp } from 'firebase/firestore';
export type StatusPedido = Pedido['statusPedido'];
export type StatusGalpao = Pedido['statusGalpao'];
import type { Setores } from './Setores';
import type { Pedido } from './Pedidos';

export interface FiltrosPedidos {
    status?: StatusPedido;
    dataInicio?: Timestamp;
    dataFim?: Timestamp;
    setor?: Setores['value'];
    responsavel?: string;
    tipoDeEntrega?: string;
    arte?: boolean;
    galpao?: boolean;
    numeroPedido?: number;
}