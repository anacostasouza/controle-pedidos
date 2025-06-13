
export enum TipoServico {
  ARTE = "ARTE",
  GRAFICA_RAPIDA = "GRAFICA_RAPIDA",
  IMPRESSAO_DIGITAL = "IMPRESSAO_DIGITAL",
  COMUNICACAO_VISUAL = "COMUNICACAO_VISUAL",
  TERCEIRIZADO = "TERCEIRIZADO"
}


export enum SubTipoServico {
  IMPRESSAO_RAPIDA = "IMPRESSAO_RAPIDA",
  IMPRESSAO_COM_ACABAMENTO = "IMPRESSAO_COM_ACABAMENTO",
  CARIMBO = "CARIMBO",
  ACABAMENTO = "ACABAMENTO",
  PLACA_SIMPLES = "PLACA_SIMPLES",
  PLACA_COMPLEXA = "PLACA_COMPLEXA"
}


export const TipoServicoValues = Object.values(TipoServico);
export type TipoServicoValue = (typeof TipoServicoValues)[number];

export const SubTipoServicoValues = Object.values(SubTipoServico);
export type SubTipoServicoValue = (typeof SubTipoServicoValues)[number];


export const TipoServicoLabels: Record<TipoServico, string> = {
  [TipoServico.ARTE]: "Arte",
  [TipoServico.GRAFICA_RAPIDA]: "Gráfica Rápida",
  [TipoServico.IMPRESSAO_DIGITAL]: "Impressão Digital",
  [TipoServico.COMUNICACAO_VISUAL]: "Comunicação Visual",
  [TipoServico.TERCEIRIZADO]: "Terceirizado"
};

export const SubTipoServicoLabels: Record<SubTipoServico, string> = {
  [SubTipoServico.IMPRESSAO_RAPIDA]: "Impressão Rápida",
  [SubTipoServico.IMPRESSAO_COM_ACABAMENTO]: "Impressão com Acabamento",
  [SubTipoServico.CARIMBO]: "Carimbo",
  [SubTipoServico.ACABAMENTO]: "Acabamento",
  [SubTipoServico.PLACA_SIMPLES]: "Placa Simples",
  [SubTipoServico.PLACA_COMPLEXA]: "Placa Complexa"
};

export const isTipoServico = (value: string): value is TipoServicoValue =>
  TipoServicoValues.includes(value as TipoServicoValue);

export const isSubTipoServico = (value: string): value is SubTipoServicoValue =>
  SubTipoServicoValues.includes(value as SubTipoServicoValue);

export const getTipoServicoLabel = (tipo: TipoServicoValue): string => {
  return TipoServicoLabels[tipo] || tipo;
};

export const getSubTipoServicoLabel = (subTipo?: SubTipoServicoValue): string => {
  return subTipo ? SubTipoServicoLabels[subTipo] || subTipo : "-";
};
