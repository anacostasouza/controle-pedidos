import {
  TipoServico,
  SubTipoServico,
  type TipoServicoValue,
  type SubTipoServicoValue,
} from "./Servicos";
import type { StatusPedido, StatusArte, StatusGalpao } from "./Pedidos";

export const STATUS_SEQUENCE_ARTE_PRINCIPAL: StatusPedido[] = [
  "Iniciado",
  "Em Aprovação",
  "Concluído",
];
export const STATUS_SEQUENCE_GRAFICA_RAPIDA_IMPRESSAO_RAPIDA: StatusPedido[] = [
  "Iniciado",
  "Impressão",
  "Concluído",
];
export const STATUS_SEQUENCE_GRAFICA_RAPIDA_IMPRESSAO_COM_ACABAMENTO: StatusPedido[] =
  ["Iniciado", "Impressão", "Acabamento", "Concluído"];
export const STATUS_SEQUENCE_GRAFICA_RAPIDA_CARIMBO: StatusPedido[] = [
  "Iniciado",
  "Impressão",
  "Montagem",
  "Concluído",
];
export const STATUS_SEQUENCE_GRAFICA_RAPIDA_ACABAMENTO: StatusPedido[] = [
  "Iniciado",
  "Acabamento",
  "Concluído",
];
export const STATUS_SEQUENCE_IMPRESSAO_DIGITAL: StatusPedido[] = [
  "Aguardando Aprovação",
  "Revisão Pendente",
  "Aprovado",
  "Impressão",
  "Acabamento",
  "Concluído",
];
export const STATUS_SEQUENCE_COMUNICACAO_VISUAL_PLACA_SIMPLES: StatusPedido[] =
  [
    "Aguardando Aprovação",
    "Revisão Pendente",
    "Aprovado",
    "Corte e Preparação do Material",
    "Montagem/Acabamento",
    "Concluído",
  ];
export const STATUS_SEQUENCE_COMUNICACAO_VISUAL_PLACA_COMPLEXA: StatusPedido[] =
  [
    "Aguardando Aprovação",
    "Revisão Pendente",
    "Aprovado",
    "Corte",
    "Estrutura",
    "Pintura",
    "Elétrica",
    "Montagem",
    "Concluído",
  ];
export const STATUS_SEQUENCE_TERCEIRIZADO: StatusPedido[] = [
  "Iniciado",
  "Pedido Feito",
  "Acabamento",
  "Liberado",
  "Concluído",
];

export const STATUS_SEQUENCE_ARTE: StatusArte[] = [
  "Iniciado",
  "Em Aprovação",
  "Concluído",
];
export const STATUS_SEQUENCE_GALPAO: StatusGalpao[] = [
  "Aguardando Aprovação",
  "Revisão Pendente",
  "Aprovado",
  "Corte e Preparação do Material",
  "Montagem/Acabamento",
  "Estrutura",
  "Pintura",
  "Elétrica",
  "Montagem",
  "Concluído",
];

export const STATUS_SEQUENCE_DEFAULT: StatusPedido[] = [
  "Iniciado",
  "Aguardando Aprovação",
  "Revisão Pendente",
  "Aprovado",
  "Concluído",
  "Corte e Preparação do Material",
  "Montagem/Acabamento",
  "Estrutura",
  "Pintura",
  "Elétrica",
  "Montagem",
  "Em Aprovação",
  "Impressão",
  "Acabamento",
];

export const todasSequenciasStatus: StatusPedido[][] = [
  STATUS_SEQUENCE_ARTE_PRINCIPAL,
  STATUS_SEQUENCE_GRAFICA_RAPIDA_IMPRESSAO_RAPIDA,
  STATUS_SEQUENCE_GRAFICA_RAPIDA_IMPRESSAO_COM_ACABAMENTO,
  STATUS_SEQUENCE_GRAFICA_RAPIDA_CARIMBO,
  STATUS_SEQUENCE_GRAFICA_RAPIDA_ACABAMENTO,
  STATUS_SEQUENCE_IMPRESSAO_DIGITAL,
  STATUS_SEQUENCE_COMUNICACAO_VISUAL_PLACA_SIMPLES,
  STATUS_SEQUENCE_COMUNICACAO_VISUAL_PLACA_COMPLEXA,
  STATUS_SEQUENCE_TERCEIRIZADO,
];

export const statusPorServico: Record<
  string,
  StatusPedido[] | Record<string, StatusPedido[]>
> = {
  [TipoServico.ARTE]: STATUS_SEQUENCE_ARTE_PRINCIPAL,
  [TipoServico.GRAFICA_RAPIDA]: {
    [SubTipoServico.IMPRESSAO_RAPIDA]:
      STATUS_SEQUENCE_GRAFICA_RAPIDA_IMPRESSAO_RAPIDA,
    [SubTipoServico.IMPRESSAO_COM_ACABAMENTO]:
      STATUS_SEQUENCE_GRAFICA_RAPIDA_IMPRESSAO_COM_ACABAMENTO,
    [SubTipoServico.CARIMBO]: STATUS_SEQUENCE_GRAFICA_RAPIDA_CARIMBO,
    [SubTipoServico.ACABAMENTO]: STATUS_SEQUENCE_GRAFICA_RAPIDA_ACABAMENTO,
  },
  [TipoServico.IMPRESSAO_DIGITAL]: STATUS_SEQUENCE_IMPRESSAO_DIGITAL,
  [TipoServico.COMUNICACAO_VISUAL]: {
    [SubTipoServico.PLACA_SIMPLES]:
      STATUS_SEQUENCE_COMUNICACAO_VISUAL_PLACA_SIMPLES,
    [SubTipoServico.PLACA_COMPLEXA]:
      STATUS_SEQUENCE_COMUNICACAO_VISUAL_PLACA_COMPLEXA,
  },
  [TipoServico.TERCEIRIZADO]: STATUS_SEQUENCE_TERCEIRIZADO,
};

export function getStatusSequenceForPedido(
  tipo: TipoServicoValue,
  subTipo?: SubTipoServicoValue | null
): StatusPedido[] {
  const serviceStatuses = statusPorServico[tipo];

  if (typeof serviceStatuses === "object" && !Array.isArray(serviceStatuses)) {
    if (subTipo && serviceStatuses[subTipo]) {
      return serviceStatuses[subTipo];
    } else {
      console.warn(
        `[StatusPedidos] SubTipo "${subTipo}" não encontrado para TipoServico "${tipo}". Retornando sequência padrão.`
      );
      return STATUS_SEQUENCE_DEFAULT;
    }
  } else if (Array.isArray(serviceStatuses)) {
    return serviceStatuses;
  } else {
    console.warn(
      `[StatusPedidos] TipoServico "${tipo}" não encontrado ou mal formatado em statusPorServico. Retornando sequência padrão.`
    );
    return STATUS_SEQUENCE_DEFAULT;
  }
}

/**
 * Retorna todos os status únicos de todas as sequências de status para todos os tipos e subtipos de serviço,
 * útil para exibir todos os status possíveis no filtro "Todos os serviços".
 */
export function getTodosStatusUnicos(): StatusPedido[] {
  const todasSequenciasStatus: StatusPedido[][] = [
    getStatusSequenceForPedido(TipoServico.ARTE),
    getStatusSequenceForPedido(
      TipoServico.GRAFICA_RAPIDA,
      SubTipoServico.IMPRESSAO_RAPIDA
    ),
    getStatusSequenceForPedido(
      TipoServico.GRAFICA_RAPIDA,
      SubTipoServico.IMPRESSAO_COM_ACABAMENTO
    ),
    getStatusSequenceForPedido(
      TipoServico.GRAFICA_RAPIDA,
      SubTipoServico.CARIMBO
    ),
    getStatusSequenceForPedido(
      TipoServico.GRAFICA_RAPIDA,
      SubTipoServico.ACABAMENTO
    ),
    getStatusSequenceForPedido(TipoServico.IMPRESSAO_DIGITAL),
    getStatusSequenceForPedido(
      TipoServico.COMUNICACAO_VISUAL,
      SubTipoServico.PLACA_SIMPLES
    ),
    getStatusSequenceForPedido(
      TipoServico.COMUNICACAO_VISUAL,
      SubTipoServico.PLACA_COMPLEXA
    ),
    getStatusSequenceForPedido(TipoServico.TERCEIRIZADO),
  ];

  const statusUnicosSet = new Set<StatusPedido>();
  todasSequenciasStatus.forEach((seq) => {
    seq.forEach((status) => statusUnicosSet.add(status));
  });

  return Array.from(statusUnicosSet);
}
