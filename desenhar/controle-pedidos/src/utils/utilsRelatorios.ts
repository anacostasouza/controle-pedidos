import type { Pedido } from "../types/Pedidos";
import {
  TipoServicoLabels,
  SubTipoServicoLabels,
  SubTipoServico,
} from "../types/Servicos";
import { formatDate } from "./dashboardUtils";


export const getTipoServicoLabel = (tipo?: string): string => {
  if (!tipo) return "";
  return TipoServicoLabels[tipo] ?? tipo;
};


export const getSubTipoServicoLabel = (subTipo?: string): string => {
  if (!subTipo) return "";
  return SubTipoServicoLabels[subTipo as SubTipoServico] ?? subTipo;
};

export const gerarCsvPedidos = (pedidos: Pedido[]): string => {
  const headers = [
    "Nº Pedido",
    "Cliente",
    "Serviço",
    "Subtipo",
    "Status",
    "Prazo de Entrega",
    "Data de Criação",
  ];

  const rows = pedidos.map((pedido) => [
    pedido.numeroPedido,
    pedido.nomeCliente,
    getTipoServicoLabel(pedido.servico?.tipo),
    getSubTipoServicoLabel(pedido.servico?.subTipo),
    pedido.statusAtual,
    formatDate(pedido.prazos?.entrega),
    formatDate(pedido.criadoEm),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((val) => `"${val}"`).join(",")),
  ].join("\n");

  return csvContent;
};
