/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { capitalizeWords } from '../../../utils/formatUtils';
import { formatarTempoHHMMSS } from "../../../utils/timeUtils";
import { RelatorioAtendimentos } from "./RelatorioAtendimentos";
import { buscarAtendimentosPorPeriodo } from "../utils/utilsRelatorioAtendimento";

import "../../../styles/HistoricoAtendimentos.css";

function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000);
  if (typeof ts._seconds === "number") return new Date(ts._seconds * 1000);
  if (typeof ts === "string" || ts instanceof Date) {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

interface HistoricoAtendimentoProps {
  atendimentos: any[];
}

export function HistoricoAtendimento({
  atendimentos,
}: Readonly<HistoricoAtendimentoProps>) {
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [atendimentosState, setAtendimentos] = useState<any[]>(atendimentos);
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroAtendente, setFiltroAtendente] = useState<string>("");
  const [carregado, setCarregado] = useState(false);

  // Só busca os atendimentos quando datas são preenchidas e o usuário clicar em "Buscar"
  const buscarHistorico = async () => {
    if (!dataInicio || !dataFim) return;
    setCarregado(false);
    const dados = await buscarAtendimentosPorPeriodo(dataInicio, dataFim);
    setAtendimentos(dados);
    setCarregado(true);
  };

  const statusUnicos = Array.from(
    new Set(atendimentosState.map((a) => a.status))
  ).filter((s) =>
    ["Finalizado", "Cancelado", "Adicionado ao controle de pedidos"].includes(s)
  );
  const atendentesUnicos = Array.from(
    new Set(atendimentosState.map((a) => a.atendente).filter(Boolean))
  );

  const atendimentosFiltrados = atendimentosState.filter(
    (a) =>
      ["Finalizado", "Cancelado", "Adicionado ao controle de pedidos"].includes(
        a.status
      ) &&
      (filtroStatus ? a.status === filtroStatus : true) &&
      (filtroAtendente ? a.atendente === filtroAtendente : true)
  );

  console.log("atendimentosFiltrados", atendimentosFiltrados);

  return (
    <div>
      <div className="title-historico">
        <h2>Histórico de Atendimentos</h2>
        <div id="filtros-historico">
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            title="Data início"
          />
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            title="Data fim"
          />
          <button onClick={buscarHistorico} disabled={!dataInicio || !dataFim}>
            Buscar
          </button>
        </div>
      </div>
      {!carregado && (
        <p style={{ textAlign: "center", marginTop: "20px" }} className="aviso">
          Preencha as datas e clique em "Buscar" para carregar o histórico.
        </p>
      )}
      {carregado && (
        <>
          <div id="filtros-historico-secundario">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="">Status: Todos</option>
              {statusUnicos.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={filtroAtendente}
              onChange={(e) => setFiltroAtendente(e.target.value)}
            >
              <option value="">Atendente: Todos</option>
              {atendentesUnicos.map((at) => (
                <option key={at} value={at}>
                  {at}
                </option>
              ))}
            </select>
          </div>
          <table id="tabela-historico">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Código do Pedido</th>
                <th>Tipo de Atendimento</th>
                <th>Status</th>
                <th>Atendente</th>
                <th>Tempo de Espera</th>
                <th>Tempo de Atendimento</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {atendimentosFiltrados.map((atendimento, index) => (
                <tr key={index}>
                  <td>{capitalizeWords(atendimento.nomeCliente)}</td>
                  <td>{atendimento.codigoPedido || "-"}</td>
                  <td>{atendimento.tipoAtendimento}</td>
                  <td>{atendimento.status}</td>
                  <td>{atendimento.atendente}</td>
                  <td>{formatarTempoHHMMSS(atendimento.tempoEspera)}</td>
                  <td>{formatarTempoHHMMSS(atendimento.tempoAtendimento)}</td>
                  <td>
                    {(() => {
                      const data = toDate(atendimento.criadoEm);
                      return data ? data.toLocaleDateString("pt-BR") : "-";
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <RelatorioAtendimentos atendimentos={atendimentosFiltrados} />
        </>
      )}
    </div>
  );
}

