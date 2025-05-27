export type StatusArte = "Iniciado" | "Em Aprovação" | "Concluído";

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
