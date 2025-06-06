import { Timestamp } from "firebase/firestore"
import { type StatusPedido } from "../types/Pedidos"

export type StatusArte = "Iniciado" | "Em Aprovação" | "Concluído";

export interface StatusArteHist {
  status: StatusArte;
  data: Timestamp;
  responsavel: string;
}

export interface StatusGalpaoHist {
  status: StatusGalpao
  data: Timestamp;
  responsavel: string;
}

export type StatusGraficaRapida =
  | "Impressão"
  | "Acabamento"
  | "Montagem"
  | "Concluído";

export type StatusImpressaoDigital = "Impressão" | "Acabamento" | "Concluído";

export type StatusComunicacaoVisualPlacaSimples =
  | "Corte e Preparação do Material"
  | "Montagem / Acabamento"
  | "Concluído";

export type StatusComunicacaoVisualPlacaComplexa =
  | "Corte"
  | "Estrutura"
  | "Pintura"
  | "Elétrica"
  | "Montagem"
  | "Concluído";

export type StatusGalpao = 
  | "Corte e Preparação do Material"
  | "Montagem / Acabamento"
  | "Concluído"
  | "Corte"
  | "Estrutura"
  | "Pintura"
  | "Elétrica"
  | "Montagem"
  | "Concluído";

  // utils/statusUtils.ts

export const StatusArteOptions: StatusPedido[] = [
  "Iniciado",
  "Em Aprovação",
  "Concluído",
  // ... outros status válidos para Arte
];

export const StatusGalpaoOptions: StatusPedido[] = [
  "Impressão",
  "Acabamento",
  "Montagem",
  // ... outros status válidos para Galpão
];


export type StatusTerceirizado = "Pedido Feito" | "Acabamento" | "Liberado";

export const statusPorServico = {
  Arte: ["Iniciado", "Em Aprovação", "Concluído"] as const,
  "Impressão Rápida": ["Impressão", "Concluído"] as const,
  "Impressão com Acabamento": ["Impressão", "Acabamento", "Concluído"] as const,
  Carimbo: ["Impressão", "Montagem", "Concluído"] as const,
  Acabamento: ["Acabamento", "Concluído"] as const,
  "Impressão Digital": ["Impressão", "Acabamento", "Concluído"] as const,
  "Placa Simples": [
    "Corte e Preparação do Material",
    "Montagem / Acabamento",
    "Concluído",
  ] as const,
  "Placa Complexa": [
    "Corte",
    "Estrutura",
    "Pintura",
    "Elétrica",
    "Montagem",
    "Concluído",
  ] as const,
  Terceirizado: ["Pedido Feito", "Acabamento", "Liberado"] as const,
};

export function obterStatusValidos(servico: string): readonly string[] {
  return statusPorServico[servico as keyof typeof statusPorServico] ?? [];
}
