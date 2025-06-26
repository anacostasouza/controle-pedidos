import type { StatusPedido } from "../types/Pedidos";
import { TipoServico, SubTipoServico } from "../types/Servicos";

type StatusList = StatusPedido[];

type WorkflowMap = StatusList | Partial<Record<SubTipoServico, StatusList>>;

export const getNextStatus = (
  serviceType: TipoServico,
  subType?: SubTipoServico
): StatusPedido[] => {
  const workflows: Record<TipoServico, WorkflowMap> = {
    [TipoServico.ARTE]: ["Iniciado", "Em Aprovação", "Concluído"],

    [TipoServico.GRAFICA_RAPIDA]: {
      [SubTipoServico.IMPRESSAO_RAPIDA]: ["Impressão", "Concluído"],
      [SubTipoServico.IMPRESSAO_COM_ACABAMENTO]: ["Impressão", "Acabamento", "Concluído"],
      [SubTipoServico.CARIMBO]: ["Impressão", "Concluído"],
      [SubTipoServico.ACABAMENTO]: ["Acabamento", "Concluído"],
    },

    [TipoServico.IMPRESSAO_DIGITAL]: {
      [SubTipoServico.IMPRESSAO_RAPIDA]: ["Impressão", "Concluído"],
      [SubTipoServico.IMPRESSAO_COM_ACABAMENTO]: ["Impressão", "Acabamento", "Concluído"],
      [SubTipoServico.CARIMBO]: ["Impressão", "Concluído"],
      [SubTipoServico.ACABAMENTO]: ["Acabamento", "Concluído"],
    },

    [TipoServico.COMUNICACAO_VISUAL]: {
      [SubTipoServico.PLACA_SIMPLES]: ["Corte", "Concluído"],
      [SubTipoServico.PLACA_COMPLEXA]: ["Corte", "Estrutura", "Pintura", "Elétrica", "Concluído"],
    },

    [TipoServico.TERCEIRIZADO]: ["Pedido Feito", "Liberado", "Concluído"],
  };

  const flow = workflows[serviceType];

  if (Array.isArray(flow)) return flow;

  if (subType && flow?.[subType]) return flow[subType];

  return [];
};
