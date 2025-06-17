import type { Pedido, StatusPedido } from "../types/Pedidos";
import { Timestamp } from "firebase/firestore";

export function formatDate(timestamp?: Timestamp): string {
  if (!timestamp) return "-";
  return timestamp.toDate().toLocaleDateString("pt-BR", {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function isPedidoAtrasado(entrega?: Timestamp): boolean {
  if (!entrega) return false;

  const entregaDate = entrega.toDate();
   const now = new Date();
   
  return entregaDate.getTime() < now.getTime();
}

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

export function isStatusPedido(value: unknown): value is StatusPedido {
  return [
    "Iniciado", "Em Aprovação", "Concluído", "Impressão", "Acabamento",
    "Montagem", "Montagem/Acabamento", "Pedido Feito", "Liberado",
    "Corte", "Estrutura", "Pintura", "Elétrica", "Corte e Preparação"
  ].includes(value as string);
}

