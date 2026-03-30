/* eslint-disable @typescript-eslint/no-unused-vars */
 
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { buscarPedidosRelatorio } from "../../services/ControlePedidosServices";

import { capitalizeWords } from "../../utils/FormatUtils";
import Header from "../../components/layout/headerPage";
import {
  gerarExcelPedidosPorServico,
  getTipoServicoLabel,
  getSubTipoServicoLabel,
  fetchTiposServico,
  fetchSubTiposServico,
  fetchStatusPorServico,
  formatDate,
} from "./utils/utilsRelatorios";
import type { Pedido, StatusPedido } from "../../types/Pedidos";

import "../../styles/Relatorios.css";

export default function RelatoriosPage() {
  const OPCOES_ITENS_POR_PAGINA = [25, 50, 100];

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroSubTipo, setFiltroSubTipo] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroCliente, setFiltroCliente] = useState<string>("");
  const [filtroResponsavelUid, setFiltroResponsavelUid] = useState<string>("");

  const [dataInicioInclusao, setDataInicioInclusao] = useState<string>("");
  const [dataFimInclusao, setDataFimInclusao] = useState<string>("");
  const [dataInicioRetirada, setDataInicioRetirada] = useState<string>("");
  const [dataFimRetirada, setDataFimRetirada] = useState<string>("");

  // Filtros para selects
  const [tiposServico, setTiposServico] = useState<string[]>([]);
  const [subTiposServico, setSubTiposServico] = useState<string[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusPedido[]>([]);
  const [responsaveis, setResponsaveis] = useState<{ uid: string; nome: string }[]>([]);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState<number>(50);
  const [nextLastEntrega, setNextLastEntrega] = useState<number | null>(null);
  const [totalPedidos, setTotalPedidos] = useState<number>(0);
  const [lastEntregas, setLastEntregas] = useState<number[]>([]);
  const [lastIds, setLastIds] = useState<string[]>([]);

  const totalPaginas = Math.max(1, Math.ceil(totalPedidos / itensPorPagina));

  const atualizarPagina = (pagina: number) => {
    setPaginaAtual(Math.max(1, pagina));
  };

  const atualizarFiltro = (setFiltro: (value: string) => void, value: string) => {
    setFiltro(value);
    setPaginaAtual(1);
  };

  // Busca pedidos filtrados e paginados do backend
  const fetchPedidosBackend = async (pagina: number) => {
    setLoading(true);
    try {
      const token = (await getAuth().currentUser?.getIdToken()) ?? "";
      const params: Record<string, string> = {
        filtroTipo: filtroTipo ?? "",
        filtroSubTipo: filtroSubTipo ?? "",
        filtroStatus: filtroStatus ?? "",
        filtroCliente: filtroCliente ?? "",
        filtroResponsavelUid: filtroResponsavelUid ?? "",
        dataInicioInclusao: dataInicioInclusao ?? "",
        dataFimInclusao: dataFimInclusao ?? "",
        dataInicioRetirada: dataInicioRetirada ?? "",
        dataFimRetirada: dataFimRetirada ?? "",
        itensPorPagina: String(itensPorPagina), 
      };
      if (pagina > 1 && lastEntregas[pagina - 2] && lastIds[pagina - 2]) {
        params.lastEntrega = String(lastEntregas[pagina - 2]);
        params.lastId = lastIds[pagina - 2];
      }

      const resultado = await buscarPedidosRelatorio(params, token);
      setPedidos(resultado.pedidos || []);
      setTotalPedidos(resultado.total ?? 0);

      // Salva cursores para próxima página
      if (resultado.nextLastEntrega && resultado.nextLastId) {
        setLastEntregas((prev) => {
          const arr = [...prev];
          arr[pagina - 1] = resultado.nextLastEntrega;
          return arr;
        });
        setLastIds((prev) => {
          const arr = [...prev];
          arr[pagina - 1] = resultado.nextLastId;
          return arr;
        });
      }
    } catch (err) {
      setPedidos([]);
      setTotalPedidos(0);
    }
    setLoading(false);
  };

  // Atualize para buscar pedidos ao mudar filtros ou página
  useEffect(() => {
    // Só busca se ambos os campos de data estiverem definidos
    const inclusaoOK = dataInicioInclusao && dataFimInclusao;
    const retiradaOK = dataInicioRetirada && dataFimRetirada;
    if (!inclusaoOK && !retiradaOK) {
      setPedidos([]);
      setLoading(false);
      setPaginaAtual(1);
      setNextLastEntrega(null);
      setTotalPedidos(0);
      return;
    }
    setPaginaAtual(1);
    setLastEntregas([]);
    setLastIds([]); 
    fetchPedidosBackend(1);
    // eslint-disable-next-line
  }, [
    filtroTipo,
    filtroSubTipo,
    filtroStatus,
    filtroCliente,
    filtroResponsavelUid,
    dataInicioInclusao,
    dataFimInclusao,
    dataInicioRetirada,
    dataFimRetirada,
    itensPorPagina,
    paginaAtual,
  ]);

  // Efeito para buscar quando página ou itens por página mudam
  useEffect(() => {
    const inclusaoOK = dataInicioInclusao && dataFimInclusao;
    const retiradaOK = dataInicioRetirada && dataFimRetirada;
    if ((inclusaoOK || retiradaOK) && paginaAtual > 0) {
      fetchPedidosBackend(paginaAtual);
    }
    // eslint-disable-next-line
  }, [paginaAtual, itensPorPagina]);

  // Efeito para buscar responsáveis (usuários) do Firestore
  useEffect(() => {
    const fetchResponsaveis = async () => {
      const db = getFirestore();
      const snapshot = await getDocs(collection(db, "usuarios"));
      const lista = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          nome: data.displayName || data.nome || "",
        };
      });
      setResponsaveis(lista);
    };
    fetchResponsaveis();
  }, []);

  // Filtros de tipos, subtipos e status
  useEffect(() => {
    const fetchFiltros = async () => {
      const tipos = await fetchTiposServico();
      setTiposServico(tipos);
    };
    fetchFiltros();
  }, []);

  useEffect(() => {
    const fetchSubTipos = async () => {
      if (!filtroTipo) {
        setSubTiposServico([]);
        setFiltroSubTipo("");
        return;
      }
      const subs = await fetchSubTiposServico(filtroTipo);
      setSubTiposServico(subs);
      setFiltroSubTipo("");
    };
    fetchSubTipos();
  }, [filtroTipo]);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!filtroTipo) {
        setStatusOptions([]);
        setFiltroStatus("");
        return;
      }
      const status = await fetchStatusPorServico(filtroTipo, filtroSubTipo);
      setStatusOptions(status);
      setFiltroStatus("");
    };
    fetchStatus();
  }, [filtroTipo, filtroSubTipo]);

  // ------------- Exportar XLSX -----------------
  const exportarXLSX = async () => {
    setLoading(true);
    try {
      // Validação: deve ter ao menos um par de datas definido
      const inclusaoOK = dataInicioInclusao && dataFimInclusao;
      const retiradaOK = dataInicioRetirada && dataFimRetirada;
      
      if (!inclusaoOK && !retiradaOK) {
        alert("Selecione um período de datas antes de exportar!");
        setLoading(false);
        return;
      }

      const token = await getAuth().currentUser?.getIdToken();
      if (!token) {
        if (import.meta.env.DEV) {
          console.error("Usuário não autenticado");
        }
        setLoading(false);
        return;
      }

      // Monta os filtros base e pagina em lotes para exportar todos os pedidos filtrados.
      const paramsBase: Record<string, string> = {};

      // Adicionar apenas filtros não vazios
      if (filtroTipo) paramsBase.filtroTipo = filtroTipo;
      if (filtroSubTipo) paramsBase.filtroSubTipo = filtroSubTipo;
      if (filtroStatus) paramsBase.filtroStatus = filtroStatus;
      if (filtroCliente) paramsBase.filtroCliente = filtroCliente;
      if (filtroResponsavelUid) paramsBase.filtroResponsavelUid = filtroResponsavelUid;
      
      // Adicionar datas apenas se estiverem preenchidas
      if (dataInicioInclusao) paramsBase.dataInicioInclusao = dataInicioInclusao;
      if (dataFimInclusao) paramsBase.dataFimInclusao = dataFimInclusao;
      if (dataInicioRetirada) paramsBase.dataInicioRetirada = dataInicioRetirada;
      if (dataFimRetirada) paramsBase.dataFimRetirada = dataFimRetirada;

      const todosPedidos: Pedido[] = [];
      const tamanhoLote = 200;
      let lastEntregaCursor: number | null = null;
      let lastIdCursor: string | null = null;

      for (let i = 0; i < 200; i++) {
        const paramsLote: Record<string, string> = {
          ...paramsBase,
          itensPorPagina: String(tamanhoLote),
        };

        if (lastEntregaCursor !== null && lastIdCursor) {
          paramsLote.lastEntrega = String(lastEntregaCursor);
          paramsLote.lastId = lastIdCursor;
        }

        const resultado = await buscarPedidosRelatorio(paramsLote, token);
        const pedidosLote = (resultado.pedidos || []) as Pedido[];

        if (pedidosLote.length === 0) {
          break;
        }

        todosPedidos.push(...pedidosLote);

        if (!resultado.nextLastEntrega || !resultado.nextLastId) {
          break;
        }

        lastEntregaCursor = resultado.nextLastEntrega;
        lastIdCursor = resultado.nextLastId;

        if (pedidosLote.length < tamanhoLote) {
          break;
        }
      }
      
      // Validação adicional: verificar se recebeu pedidos dentro do período esperado
      if (import.meta.env.DEV) {
        console.log(`Exportando ${todosPedidos.length} pedidos com filtros:`, paramsBase);
      }
      
      const excelBuffer = await gerarExcelPedidosPorServico(todosPedidos);

      const arrayBuffer =
        excelBuffer instanceof ArrayBuffer
          ? excelBuffer
          : new Uint8Array(excelBuffer).buffer;

      const blob = new Blob([arrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, "relatorio-pedidos.xlsx");
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Erro ao exportar XLSX:", err);
      }
      alert("Erro ao exportar relatório. Verifique os filtros e tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div className="relatorios-page">
      <div className="relatorios-header">
        <Header />
      </div>

      <div className="relatorios-filtros">
        <div className="filtros-no-data">
          <label>
            Tipo Serviço:
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos</option>
              {tiposServico.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {getTipoServicoLabel(tipo)}
                </option>
              ))}
            </select>
          </label>

          {subTiposServico.length > 0 && (
            <label>
              Subtipo Serviço:
              <select
                value={filtroSubTipo}
                onChange={(e) => setFiltroSubTipo(e.target.value)}
              >
                <option value="">Todos</option>
                {subTiposServico.map((sub) => (
                  <option key={sub} value={sub}>
                    {getSubTipoServicoLabel(sub)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {statusOptions.length > 0 && (
            <label>
              Status:
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="">Todos</option>
                {statusOptions.map((status, index) => (
                  <option key={index} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Cliente ou código do pedido:
            <input
              type="text"
              placeholder="Filtrar por cliente"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            />
          </label>

          <label>
            Responsável:
            <select
              value={filtroResponsavelUid}
              onChange={(e) => setFiltroResponsavelUid(e.target.value)}
            >
              <option value="">Todos</option>
              {responsaveis.map((resp) => (
                <option key={resp.uid} value={resp.uid}>
                  {resp.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Agrupe os filtros de datas de inclusão */}
        <div
          className={`filtros-datas-group${
            dataInicioRetirada || dataFimRetirada ? " disabled" : ""
          }`}
        >
          <div style={{ flex: 1 }}>
            <div className="filtros-datas-label">
              Filtrar por Data de Inclusão
            </div>
            <label>
              Início:
              <input
                type="date"
                value={dataInicioInclusao}
                onChange={(e) => {
                  setDataInicioInclusao(e.target.value);
                  if (!e.target.value) setDataFimInclusao("");
                  setDataInicioRetirada("");
                  setDataFimRetirada("");
                }}
                required
                disabled={!!dataInicioRetirada || !!dataFimRetirada}
              />
            </label>
            <label>
              Fim:
              <input
                type="date"
                value={dataFimInclusao}
                onChange={(e) => {
                  setDataFimInclusao(e.target.value);
                  if (e.target.value) {
                    setDataInicioRetirada("");
                    setDataFimRetirada("");
                  }
                }}
                disabled={!!dataInicioRetirada || !!dataFimRetirada}
              />
            </label>
          </div>
        </div>

        {/* Agrupe os filtros de datas de retirada */}
        <div
          className={`filtros-datas-group${
            dataInicioInclusao || dataFimInclusao ? " disabled" : ""
          }`}
        >
          <div style={{ flex: 1 }}>
            <div className="filtros-datas-label">
              Filtrar por Data de Retirada
            </div>
            <label>
              Início:
              <input
                type="date"
                value={dataInicioRetirada}
                onChange={(e) => {
                  setDataInicioRetirada(e.target.value);
                  if (!e.target.value) setDataFimRetirada(""); // limpa fim se início for limpo
                  setDataInicioInclusao("");
                  setDataFimInclusao("");
                }}
                required
                disabled={!!dataInicioInclusao || !!dataFimInclusao}
              />
            </label>
            <label>
              Fim:
              <input
                type="date"
                value={dataFimRetirada}
                onChange={(e) => {
                  setDataFimRetirada(e.target.value);
                  if (e.target.value) {
                    setDataInicioInclusao("");
                    setDataFimInclusao("");
                  }
                }}
                disabled={!!dataInicioInclusao || !!dataFimInclusao}
              />
            </label>
          </div>
        </div>
      </div>

      {!(
        (dataInicioInclusao && dataFimInclusao) ||
        (dataInicioRetirada && dataFimRetirada)
      ) && (
        <div className="relatorios-alerta">
          Selecione <b>início e fim</b> de <b>Data de Inclusão</b> ou{" "}
          <b>Data de Retirada</b> para visualizar e exportar relatórios.
        </div>
      )}

      <div className="relatorios-actions">
        <button
          className="relatorio-exportar-button"
          onClick={exportarXLSX}
          disabled={loading || (!dataInicioInclusao && !dataInicioRetirada)}
        >
          {loading ? "Exportando..." : "Exportar Relátorio"}
        </button>
      </div>

      {loading ? (
        <p>Carregando pedidos...</p>
      ) : (
        <>
          <table className="relatorios-table">
            <thead>
              <tr>
                <th>Nº Pedido</th>
                <th>Cliente</th>
                <th>Responsável</th>
                <th>Serviço</th>
                <th>Subtipo</th>
                <th>Status</th>
                <th>Data de Criação</th>
                <th>Data de Retirada</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr
                  key={pedido.id}
                  className={pedido.retrabalho ? "retrabalho-row" : ""}
                >
                  <td>
                    {pedido.numeroPedido}
                    {pedido.retrabalho && (
                      <span className="badge-retrabalho" title="Pedido de retrabalho">
                        Retrabalho
                      </span>
                    )}
                  </td>
                  <td>{pedido.nomeCliente}</td>
                  <td>{capitalizeWords(pedido.responsavel || "-")}</td>
                  <td>{getTipoServicoLabel(pedido.servico?.tipo)}</td>
                  <td>{getSubTipoServicoLabel(pedido.servico?.subTipo)}</td>
                  <td>{pedido.statusAtual}</td>
                  <td>{formatDate(pedido.criadoEm)}</td>
                  <td>{formatDate(pedido.prazos?.entrega)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginação */}
          <div className="relatorios-paginacao">
            <div className="relatorios-paginacao-info">
              Mostrando {pedidos.length} de {totalPedidos} resultados
            </div>
            <div className="relatorios-paginacao-actions">
              <label htmlFor="itens-por-pagina-relatorio">Itens por página:</label>
              <select
                id="itens-por-pagina-relatorio"
                value={itensPorPagina}
                onChange={(e) => {
                  setItensPorPagina(Number(e.target.value));
                  setPaginaAtual(1);
                }}
              >
                {OPCOES_ITENS_POR_PAGINA.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="relatorios-paginacao-btn"
                onClick={() => atualizarPagina(paginaAtual - 1)}
                disabled={paginaAtual <= 1 || loading}
              >
                Anterior
              </button>
              <span className="relatorios-paginacao-pagina">
                Página {paginaAtual} de {totalPaginas}
              </span>
              <button
                type="button"
                className="relatorios-paginacao-btn"
                onClick={() => atualizarPagina(paginaAtual + 1)}
                disabled={paginaAtual >= totalPaginas || loading}
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
