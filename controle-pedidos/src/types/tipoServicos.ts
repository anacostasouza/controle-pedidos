import {
  TipoServico,
  SubTipoServico,
  TipoServicoLabels,
  SubTipoServicoLabels,
} from "../types/Servicos";

export const tiposServico = [
  { value: TipoServico.PLOTAGEM, label: TipoServicoLabels[TipoServico.PLOTAGEM] },
  { value: TipoServico.ARTE, label: TipoServicoLabels[TipoServico.ARTE] },
  {
    value: TipoServico.GRAFICA_RAPIDA,
    label: TipoServicoLabels[TipoServico.GRAFICA_RAPIDA],
    subTipos: [
      {
        value: SubTipoServico.IMPRESSAO_RAPIDA,
        label: SubTipoServicoLabels[SubTipoServico.IMPRESSAO_RAPIDA],
      },
      {
        value: SubTipoServico.IMPRESSAO_COM_ACABAMENTO,
        label: SubTipoServicoLabels[SubTipoServico.IMPRESSAO_COM_ACABAMENTO],
      },
      {
        value: SubTipoServico.CARIMBO,
        label: SubTipoServicoLabels[SubTipoServico.CARIMBO],
      },
      {
        value: SubTipoServico.ACABAMENTO,
        label: SubTipoServicoLabels[SubTipoServico.ACABAMENTO],
      },
    ],
  },
  {
    value: TipoServico.IMPRESSAO_DIGITAL,
    label: TipoServicoLabels[TipoServico.IMPRESSAO_DIGITAL],
  },
  {
    value: TipoServico.COMUNICACAO_VISUAL,
    label: TipoServicoLabels[TipoServico.COMUNICACAO_VISUAL],
    subTipos: [
      {
        value: SubTipoServico.PLACA_SIMPLES,
        label: SubTipoServicoLabels[SubTipoServico.PLACA_SIMPLES],
      },
      {
        value: SubTipoServico.PLACA_COMPLEXA,
        label: SubTipoServicoLabels[SubTipoServico.PLACA_COMPLEXA],
      },
    ],
  },
  {
    value: TipoServico.TERCEIRIZADO,
    label: TipoServicoLabels[TipoServico.TERCEIRIZADO],
  },
];
