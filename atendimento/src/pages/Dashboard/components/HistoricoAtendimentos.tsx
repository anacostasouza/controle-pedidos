/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../../../services/firebase";
import { formatarTempoHHMMSS } from "../../../utils/timeUtils";
import { RelatorioAtendimentos } from "./RelatorioAtendimentos";
import { buscarHistoricoComFiltros, buscarServicosAtendimento } from "../../../services/AtendimentoServices";

import "../../../styles/HistoricoAtendimentos.css";

function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000);
  if (typeof ts._seconds === "number") return new Date(ts._seconds * 1000);
  if (typeof ts === "string" || ts instanceof Date) {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function HistoricoAtendimento() {
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [atendimentos, setAtendimentos] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroAtendente, setFiltroAtendente] = useState<string>("");
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroConsumidor, setFiltroConsumidor] = useState<string>("");
  const [filtroTipoAtendimento, setFiltroTipoAtendimento] = useState<string>("");
  const [carregado, setCarregado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [atendentesMap, setAtendentesMap] = useState<Record<string, string>>({});
  const [servicosAtendimento, setServicosAtendimento] = useState<string[]>([]);
  const [estatisticas, setEstatisticas] = useState<any>(null);
  const [filtrosAplicados, setFiltrosAplicados] = useState<string[]>([]);

  const buscarHistorico = async () => {
    if (!dataInicio || !dataFim) return;
    
    setCarregando(true);
    setCarregado(false);

    try {
      let consumidorBoolean: boolean | undefined = undefined;
      if (filtroConsumidor === "sim") {
        consumidorBoolean = true;
      } else if (filtroConsumidor === "nao") {
        consumidorBoolean = false;
      }

      const resultado = await buscarHistoricoComFiltros(dataInicio, dataFim, {
        status: filtroStatus || undefined,
        atendenteUid: filtroAtendente || undefined,
        tipo: filtroTipo || undefined,
        consumidor: consumidorBoolean,
        tipoAtendimento: filtroTipoAtendimento || undefined,
      });
      
      setAtendimentos(resultado.atendimentos);
      setEstatisticas(resultado.estatisticas);
      setFiltrosAplicados(resultado.filtrosAplicados);
      setCarregado(true);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      alert("Erro ao buscar histórico. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (carregado) {
      buscarHistorico();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroStatus, filtroAtendente, filtroTipo, filtroConsumidor, filtroTipoAtendimento]);

  useEffect(() => {
    async function fetchAtendentes() {
      const snap = await getDocs(collection(db, "usuarios"));
      const map: Record<string, string> = {};
      snap.forEach(doc => {
        const d = doc.data();
        map[doc.id] = d.displayName || d.nome || doc.id;
      });
      setAtendentesMap(map);
    }
    fetchAtendentes();
  }, []);

  useEffect(() => {
    async function fetchServicos() {
      const servicos = await buscarServicosAtendimento();
      setServicosAtendimento(servicos.map(s => s.tipo));
    }
    fetchServicos();
  }, []);

  const statusDisponiveis = [
    "Finalizado",
    "Cancelado",
    "Adicionado ao controle de pedidos",
  ];
  
  const atendentesUnicosUid = Array.from(
    new Set(atendimentos.map((a) => a.atendenteUid).filter(Boolean))
  );

  const limparFiltros = () => {
    setFiltroStatus("");
    setFiltroAtendente("");
    setFiltroTipo("");
    setFiltroConsumidor("");
    setFiltroTipoAtendimento("");
  };

  return (
    <div>
      <div className="title-historico">
        <h2>Histórico de Atendimentos</h2>
        <div className="header-actions">
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
            <button onClick={buscarHistorico} disabled={!dataInicio || !dataFim || carregando}>
              {carregando ? "Buscando..." : "Buscar"}
            </button>
          </div>
          {carregado && <RelatorioAtendimentos atendimentos={atendimentos} />}
        </div>
      </div>
      
      {!carregado && !carregando && (
        <p style={{ textAlign: "center", marginTop: "20px" }} className="aviso">
          Preencha as datas e clique em "Buscar" para carregar o histórico.
        </p>
      )}
      {carregando && (
        <p style={{ textAlign: "center", marginTop: "20px" }} className="aviso">
          Carregando atendimentos...
        </p>
      )}
      {carregado && !carregando && (
        <>
          <div id="filtros-historico-secundario">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="">Status: Todos</option>
              {statusDisponiveis.map((status) => (
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
              {atendentesUnicosUid.map((uid) => (
                <option key={uid} value={uid}>
                  {atendentesMap[uid] || uid}
                </option>
              ))}
            </select>
            <select
              value={filtroTipoAtendimento}
              onChange={(e) => setFiltroTipoAtendimento(e.target.value)}
            >
              <option value="">Serviço: Todos</option>
              {servicosAtendimento.map((servico) => (
                <option key={servico} value={servico}>
                  {servico}
                </option>
              ))}
            </select>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Tipo: Todos</option>
              <option value="direto">Direto</option>
              <option value="fila">Fila</option>
            </select>
            <select
              value={filtroConsumidor}
              onChange={(e) => setFiltroConsumidor(e.target.value)}
            >
              <option value="">Consumidor: Todos</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
            <button onClick={limparFiltros} className="btn-limpar-filtros">
              Limpar Filtros
            </button>
          </div>

          {estatisticas && (
            <div className="estatisticas-resumo">
              <div className="stat-card">
                <span className="stat-label">Total</span>
                <span className="stat-value">{atendimentos.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Finalizados</span>
                <span className="stat-value">{estatisticas.totalFinalizados}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Cancelados</span>
                <span className="stat-value">{estatisticas.totalCancelados}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Direto</span>
                <span className="stat-value">{estatisticas.totalDireto}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Fila</span>
                <span className="stat-value">{estatisticas.totalFila}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Consumidor</span>
                <span className="stat-value">{estatisticas.totalConsumidor}</span>
              </div>
            </div>
          )}

          {filtrosAplicados.length > 0 && (
            <div className="filtros-aplicados">
              <strong>Filtros aplicados:</strong>
              <ul>
                {filtrosAplicados.map((filtro, index) => (
                  <li key={index}>{filtro}</li>
                ))}
              </ul>
            </div>
          )}

          <table id="tabela-historico">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Código do Pedido</th>
                <th>Tipo de Atendimento</th>
                <th>Status</th>
                <th>Atendente</th>
                <th>Tipo</th>
                <th>Consumidor</th>
                <th>Tempo de Espera</th>
                <th>Tempo de Atendimento</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {atendimentos.map((atendimento, index) => {
                const isAtendimentoDireto = atendimento.atendimentoDireto === true;
                const isConsumidor = atendimento.isConsumidor === true;
                
                return (
                  <tr key={index}>
                    <td>{atendimento.nomeCliente}</td>
                    <td>{atendimento.codigoPedido || "-"}</td>
                    <td>{atendimento.tipoAtendimento}</td>
                    <td>{atendimento.status}</td>
                    <td>
                      {atendentesMap[atendimento.atendenteUid] ||
                        atendimento.atendente ||
                        atendimento.atendenteUid ||
                        "-"}
                    </td>
                    <td>
                      {isAtendimentoDireto ? (
                        <span className="badge-direto">Direto</span>
                      ) : (
                        <span className="badge-fila">Fila</span>
                      )}
                    </td>
                    <td>
                      {isConsumidor ? (
                        <span className="badge-consumidor-sim">Sim</span>
                      ) : (
                        <span className="badge-consumidor-nao">Não</span>
                      )}
                    </td>
                    <td>
                      {isAtendimentoDireto
                        ? "-"
                        : formatarTempoHHMMSS(atendimento.tempoEspera)}
                    </td>
                    <td>
                      {isAtendimentoDireto
                        ? "-"
                        : formatarTempoHHMMSS(atendimento.tempoAtendimento)}
                    </td>
                    <td>
                      {(() => {
                        const data = toDate(atendimento.criadoEm);
                        return data ? data.toLocaleDateString("pt-BR") : "-";
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

