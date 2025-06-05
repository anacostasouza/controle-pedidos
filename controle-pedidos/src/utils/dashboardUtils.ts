import { type Pedido } from "../types/Pedidos";
import { Timestamp } from "firebase/firestore";

/**
 * Converte um timestamp do Firebase em string formatada.
 */
export function formatDate(timestamp?: Timestamp): string {
  if (!timestamp) return "-";
  return timestamp.toDate().toLocaleDateString("pt-BR");
}

/**
 * Verifica se um pedido está atrasado com base na data de entrega.
 */
export function isPedidoAtrasado(entrega?: Timestamp): boolean {
  if (!entrega) return false;
  const entregaDate = entrega.toDate();
  const hoje = new Date();

  // Zera a hora para comparação apenas de datas
  hoje.setHours(0, 0, 0, 0);
  entregaDate.setHours(0, 0, 0, 0);

  return entregaDate < hoje;
}

/**
 * Filtra os pedidos com base nos critérios fornecidos.
 */
export function filtrarPedidos(
  pedidos: Pedido[],
  buscaCliente: string,
  filtroServico: string,
  filtroStatus: string,
  filtroAtrasados: boolean
): Pedido[] {
  return pedidos.filter((p) => {
    const clienteMatch = p.nomeCliente.toLowerCase().includes(buscaCliente.toLowerCase());
    const servicoMatch = filtroServico ? p.servico.tipo === filtroServico : true;
    const statusMatch = filtroStatus ? p.statusAtual === filtroStatus : true;
    const atrasoMatch = filtroAtrasados ? isPedidoAtrasado(p.prazos?.entrega) : true;

    return clienteMatch && servicoMatch && statusMatch && atrasoMatch;
  });
}
