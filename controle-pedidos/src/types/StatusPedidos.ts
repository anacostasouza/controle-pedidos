import { Timestamp } from 'firebase/firestore';
import type { Pedido } from './Pedidos';
import type { Servicos } from './Servicos';

export type StatusPedido = Pedido extends { StatusPedido: infer T } ? T : never;

export interface FiltrosPedidos {
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
}