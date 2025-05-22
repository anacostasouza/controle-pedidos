export interface Pedido {
  id?: string; // ID do documento Firestore
  pedidoID: number;
  numeroPedido: number;
  nomeCliente: string;
  responsavel: string;
  servico: string;
  prazoDeEntrega: string; // ou Date
  tipoDeEntrega: string;
  arte: boolean;
  prazoArte: string; // ou Date
  galpao: boolean;
  statusGalpao: string;
  statusPedido: string;
}
