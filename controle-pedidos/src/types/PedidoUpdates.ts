import type { StatusPedido, StatusArte, StatusGalpao } from "./Pedidos";
import type { SetorValue } from "./Setores";

export interface PedidoUpdateData {
  novoStatusGeral?: StatusPedido;
  novoStatusArte?: StatusArte;
  novoStatusGalpao?: StatusGalpao;
  novaDataEntrega?: string;
  novoHorarioEntrega?: string;
}

export interface UserInfo {
  userSetor: SetorValue;
  userDisplayName: string;
  userUID: string;
}
