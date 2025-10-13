/* eslint-disable @typescript-eslint/no-explicit-any */
import FilaAtendimentoItem from "./FilaAtendimentoItem";
import {
  tempoAguardando,
  tempoAtendimento,
  formatarTempoHHMMSS,
} from "../../../utils/timeUtils";

const FILTRO_STATUS = [
  "Finalizado",
  "Cancelado",
  "Adicionado ao controle de pedidos",
];

export default function FilaAtendimentoList({
  fila,
  finalizarId,
  setFinalizarId,
  handleFinalizar,
  handleAcaoFinalizar,
  handleAdicionarControlePedidos,
  handleChamarAtendimento,
  setFila,
}: any) {
  return (
    <ul id="fila-atendimento-list">
      {fila
        .filter((item: { status: string; }) => !FILTRO_STATUS.includes(item.status))
        .map((item: any, index: number) => (
          <FilaAtendimentoItem
            key={item.id || index}
            item={item}
            finalizarId={finalizarId}
            setFinalizarId={setFinalizarId}
            handleFinalizar={handleFinalizar}
            handleAcaoFinalizar={handleAcaoFinalizar}
            handleAdicionarControlePedidos={handleAdicionarControlePedidos}
            handleChamarAtendimento={handleChamarAtendimento}
            setFila={setFila}
            tempoAguardando={tempoAguardando}
            tempoAtendimento={tempoAtendimento}
            formatarTempoHHMMSS={formatarTempoHHMMSS}
          />
        ))}
    </ul>
  );
}