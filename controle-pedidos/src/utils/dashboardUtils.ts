/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Pedido, StatusPedido } from "../types/Pedidos";
import { TipoServico, TipoServicoValues } from "../types/Servicos";
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
  buscaClienteOuNumero: string,
  filtroServico: string,
  filtroStatus: string,
  filtroAtrasados: boolean, 
  filtroRequerArte: string,
  filtroRequerGalpao: string,
  userSetor: string
): Pedido[] {
  return pedidos.filter((p) => {
    if (p.statusAtual === "Entregue" && (userSetor !== "CAIXA" || filtroStatus !== "Entregue")) {
      return false;
    }

    if (filtroAtrasados && p.statusAtual === "Concluído") {
      return false; 
    }

    if (filtroAtrasados && p.statusAtual === "Entregue") {
        return false;
    }


    const termoBuscaLower = buscaClienteOuNumero.toLowerCase();

    const numeroPedidoAsString = String(p.numeroPedido).toLowerCase();

    const clienteOuNumeroMatch =
      p.nomeCliente.toLowerCase().includes(termoBuscaLower) ||
      numeroPedidoAsString.includes(termoBuscaLower);

    const servicoMatch = filtroServico ? p.servico.tipo === (filtroServico as TipoServico) : true;
    const statusMatch = filtroStatus ? p.statusAtual === (filtroStatus as StatusPedido) : true;

    const atrasoMatch = filtroAtrasados
      ? (isPedidoAtrasado(p.prazos?.entrega) && p.statusAtual !== "Concluído" && p.statusAtual !== "Entregue")
      : true;


    let requerArteMatch = true;
    if (filtroRequerArte === "true") {
      requerArteMatch = p.requerArte === true || p.servico.tipo === TipoServico.ARTE;
    } else if (filtroRequerArte === "false") {
      requerArteMatch = p.requerArte !== true && p.servico.tipo !== TipoServico.ARTE;
    }

    let requerGalpaoMatch = true;
    if (filtroRequerGalpao === "true") {
      requerGalpaoMatch = p.requerGalpao === true || p.servico.tipo === TipoServico.COMUNICACAO_VISUAL;
    } else if (filtroRequerGalpao === "false") {
      requerGalpaoMatch = p.requerGalpao !== true && p.servico.tipo !== TipoServico.COMUNICACAO_VISUAL;
    }

    return clienteOuNumeroMatch && servicoMatch && statusMatch && atrasoMatch && requerArteMatch && requerGalpaoMatch;
  });
}

export function isStatusPedido(value: unknown): value is StatusPedido {
  return [
    "Iniciado", "Em Aprovação", "Concluído", "Impressão", "Acabamento",
    "Montagem", "Montagem/Acabamento", "Pedido Feito", "Liberado",
    "Corte", "Estrutura", "Pintura", "Elétrica", "Corte e Preparação", "Entregue"
  ].includes(value as string);
}