import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Trash2,
  RotateCcw,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  ShieldAlert,
  ArrowLeft,
  Calendar,
  Clock,
  User as UserIcon,
} from "lucide-react";
import HeaderPage from "../../components/layout/headerPage";
import {
  buscarPedidosExcluidos,
  buscarDetalhesPedidoExcluido,
  restaurarPedidoBackend,
  type PedidoExcluidoItem,
} from "../../services/ControlePedidosServices";
import { auth } from "../../services/firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import "../../styles/PedidosExcluidos.css";

export default function PedidosExcluidos(): React.ReactElement {
  const [logs, setLogs] = useState<PedidoExcluidoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  // Filtros e paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [termo, setTermo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Permissão
  const [isPermitido, setIsPermitido] = useState<boolean | null>(null);

  // Modais
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [detalhesDoc, setDetalhesDoc] = useState<any | null>(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [confirmRestoreItem, setConfirmRestoreItem] =
    useState<PedidoExcluidoItem | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Verifica permissão do usuário
  useEffect(() => {
    const checkPermission = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsPermitido(false);
        return;
      }
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const setor = (data.setorNome || data.setor || "").toLowerCase();
          const permitido =
            setor.includes("suporte") ||
            setor.includes("gestão") ||
            setor.includes("gestao") ||
            setor.includes("coordena");
          setIsPermitido(permitido);
        } else {
          setIsPermitido(false);
        }
      } catch (err) {
        console.error("Erro ao checar permissão:", err);
        setIsPermitido(false);
      }
    };
    checkPermission();
  }, []);

  const carregarLogs = useCallback(
    async (novaPagina = page) => {
      if (isPermitido === false) return;
      setLoading(true);
      setError("");
      try {
        const res = await buscarPedidosExcluidos({
          page: novaPagina,
          limit: 20,
          termo: termo.trim() || undefined,
          dataInicio: dataInicio || undefined,
          dataFim: dataFim || undefined,
        });
        setLogs(res.logs || []);
        setTotal(res.total || 0);
        setPage(res.page || 1);
        setTotalPages(res.totalPages || 1);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar auditoria de pedidos excluídos.");
      } finally {
        setLoading(false);
      }
    },
    [page, termo, dataInicio, dataFim, isPermitido]
  );

  useEffect(() => {
    if (isPermitido === true) {
      carregarLogs(1);
    }
  }, [isPermitido, dataInicio, dataFim]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    carregarLogs(1);
  };

  const handleLimparFiltros = () => {
    setTermo("");
    setDataInicio("");
    setDataFim("");
    setPage(1);
  };

  const aplicarFiltroRapido = (tipo: "hoje" | "7dias" | "mes") => {
    const hoje = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatYMD = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const fimStr = formatYMD(hoje);

    if (tipo === "hoje") {
      setDataInicio(fimStr);
      setDataFim(fimStr);
    } else if (tipo === "7dias") {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(hoje.getDate() - 7);
      setDataInicio(formatYMD(seteDiasAtras));
      setDataFim(fimStr);
    } else if (tipo === "mes") {
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      setDataInicio(formatYMD(inicioMes));
      setDataFim(fimStr);
    }
    setPage(1);
  };

  const handleAbrirDetalhes = async (logId: string) => {
    setSelectedLogId(logId);
    setLoadingDetalhes(true);
    setDetalhesDoc(null);
    try {
      const data = await buscarDetalhesPedidoExcluido(logId);
      setDetalhesDoc(data);
    } catch (err: any) {
      alert("Erro ao buscar detalhes do pedido excluído: " + err.message);
      setSelectedLogId(null);
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const handleConfirmarRestauracao = async () => {
    if (!confirmRestoreItem) return;
    setRestoring(true);
    try {
      await restaurarPedidoBackend(confirmRestoreItem.pedidoId);
      setFeedbackMessage({
        tipo: "sucesso",
        texto: `Pedido #${confirmRestoreItem.numeroPedido || confirmRestoreItem.pedidoId} restaurado com sucesso para o quadro operacional!`,
      });
      setConfirmRestoreItem(null);
      carregarLogs(page);
    } catch (err: any) {
      setFeedbackMessage({
        tipo: "erro",
        texto: "Erro ao restaurar pedido: " + (err.message || "Erro desconhecido"),
      });
    } finally {
      setRestoring(false);
    }
  };

  const formatarDataHora = (dataVal: any): string => {
    if (!dataVal) return "-";
    try {
      let d: Date;
      if (typeof dataVal === "object" && dataVal._seconds) {
        d = new Date(dataVal._seconds * 1000);
      } else if (typeof dataVal === "string" || typeof dataVal === "number") {
        d = new Date(dataVal);
      } else {
        return "-";
      }
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const formatarMoeda = (valor?: number): string => {
    if (typeof valor !== "number") return "R$ 0,00";
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // KPIs
  const totalRestaurados = logs.filter((l) => l.restaurado).length;
  const totalPendentesExcluidos = logs.filter((l) => !l.restaurado).length;

  if (isPermitido === false) {
    return (
      <div className="pedidos-excluidos-page">
        <HeaderPage />
        <div
          style={{
            background: "#fff",
            padding: "40px 20px",
            borderRadius: "16px",
            textAlign: "center",
            maxWidth: "600px",
            margin: "40px auto",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <ShieldAlert size={56} color="#dc2626" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ color: "#991b1b", marginBottom: "8px" }}>Acesso Restrito</h2>
          <p style={{ color: "#64748b", marginBottom: "24px" }}>
            Esta área de auditoria de pedidos excluídos é restrita exclusivamente para as
            equipes de <strong>Suporte</strong> e <strong>Coordenação / Gestão</strong>.
          </p>
          <Link to="/dashboard" className="btn-voltar-dashboard">
            <ArrowLeft size={16} /> Voltar para o Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pedidos-excluidos-page">
      <HeaderPage />

      {/* Topo / Título */}
      <div className="pedidos-excluidos-top">
        <div className="pedidos-excluidos-title-area">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link to="/dashboard" className="btn-voltar-dashboard">
              <ArrowLeft size={16} /> Dashboard
            </Link>
            <h1 className="pedidos-excluidos-title">
              <Trash2 size={26} /> Auditoria de Pedidos Excluídos
            </h1>
          </div>
          <p className="pedidos-excluidos-subtitle">
            Rastreamento completo e restauração de pedidos removidos do sistema.
          </p>
        </div>

        <div className="badge-restrito">
          <ShieldAlert size={14} /> Suporte & Coordenação
        </div>
      </div>

      {/* Notificação / Feedback */}
      {feedbackMessage && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              feedbackMessage.tipo === "sucesso" ? "#dcfce7" : "#fee2e2",
            color: feedbackMessage.tipo === "sucesso" ? "#166534" : "#991b1b",
            border: `1px solid ${
              feedbackMessage.tipo === "sucesso" ? "#bbf7d0" : "#fecaca"
            }`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {feedbackMessage.tipo === "sucesso" ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              {feedbackMessage.texto}
            </span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "inherit",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="pedidos-excluidos-kpis">
        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Total de Exclusões Registradas</span>
            <span className="kpi-value">{total}</span>
          </div>
          <div className="kpi-icon-wrap kpi-icon-red">
            <Trash2 size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Excluídos Não Restaurados</span>
            <span className="kpi-value">{totalPendentesExcluidos}</span>
          </div>
          <div className="kpi-icon-wrap kpi-icon-amber">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Pedidos Restaurados</span>
            <span className="kpi-value">{totalRestaurados}</span>
          </div>
          <div className="kpi-icon-wrap kpi-icon-green">
            <RotateCcw size={22} />
          </div>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="pedidos-excluidos-filtros">
        <form onSubmit={handleBuscar} className="filtros-row">
          <div className="filtro-item filtro-busca">
            <label>Buscar Pedido, Cliente ou Motivo</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Nº pedido, nome do cliente, motivo..."
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                className="filtro-input"
                style={{ width: "100%", paddingLeft: "32px", boxSizing: "border-box" }}
              />
              <Search
                size={16}
                color="#94a3b8"
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            </div>
          </div>

          <div className="filtro-item">
            <label>Data Inicial</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="filtro-input"
            />
          </div>

          <div className="filtro-item">
            <label>Data Final</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="filtro-input"
            />
          </div>

          <div className="filtro-botoes-atalho">
            <button
              type="button"
              onClick={() => aplicarFiltroRapido("hoje")}
              className="btn-atalho-data"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => aplicarFiltroRapido("7dias")}
              className="btn-atalho-data"
            >
              7 dias
            </button>
            <button
              type="button"
              onClick={() => aplicarFiltroRapido("mes")}
              className="btn-atalho-data"
            >
              Mês
            </button>
            <button
              type="button"
              onClick={handleLimparFiltros}
              className="btn-limpar-filtros"
            >
              Limpar
            </button>
            <button
              type="submit"
              className="btn-atalho-data"
              style={{
                background: "var(--primary-color)",
                color: "#fff",
                borderColor: "var(--primary-color)",
              }}
            >
              Filtrar
            </button>
          </div>
        </form>
      </div>

      {/* Tabela de Resultados */}
      <div className="pedidos-excluidos-tabela-container">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            Carregando registros de auditoria...
          </div>
        ) : error ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#dc2626" }}>
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            Nenhum pedido excluído encontrado para os filtros selecionados.
          </div>
        ) : (
          <table className="pedidos-excluidos-tabela">
            <thead>
              <tr>
                <th>Nº Pedido</th>
                <th>Cliente</th>
                <th>Data da Exclusão</th>
                <th>Excluído Por</th>
                <th>Motivo da Exclusão</th>
                <th>Valor Total</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const clienteNome =
                  typeof log.cliente === "object"
                    ? log.cliente?.nome || log.cliente?.razaoSocial || "Cliente Consumidor"
                    : log.cliente || "Cliente Consumidor";

                return (
                  <tr key={log.id}>
                    <td>
                      <span className="pedido-numero-badge">
                        #{log.numeroPedido || log.pedidoId.substring(0, 8)}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: "#334155" }}>{clienteNome}</strong>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={14} color="#94a3b8" />
                        <span>{formatarDataHora(log.excluidoEm)}</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{log.excluidoPor?.nome || "Usuário"}</strong>
                        <div>
                          <span className="usuario-setor-pill">
                            {log.excluidoPor?.setor || "Interno"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: "#7f1d1d", fontWeight: 500 }}>
                        {log.motivo || "Não informado"}
                      </span>
                    </td>
                    <td>{formatarMoeda(log.valorTotal)}</td>
                    <td>
                      {log.restaurado ? (
                        <span className="status-badge restaurado">
                          <CheckCircle2 size={12} /> Restaurado
                        </span>
                      ) : (
                        <span className="status-badge excluido">
                          <Trash2 size={12} /> Excluído
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="tabela-acoes">
                        <button
                          className="btn-acao btn-detalhes"
                          onClick={() => handleAbrirDetalhes(log.id)}
                          title="Visualizar snapshot completo"
                        >
                          <Eye size={14} /> Detalhes
                        </button>

                        {!log.restaurado && (
                          <button
                            className="btn-acao btn-restaurar"
                            onClick={() => setConfirmRestoreItem(log)}
                            title="Restaurar pedido para o Dashboard ativo"
                          >
                            <RotateCcw size={14} /> Restaurar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Paginação */}
        {total > 0 && (
          <div className="pedidos-excluidos-paginacao">
            <span>
              Exibindo {logs.length} de {total} pedidos registrados
            </span>
            <div className="paginacao-controles">
              <button
                className="btn-paginacao"
                disabled={page <= 1 || loading}
                onClick={() => carregarLogs(page - 1)}
              >
                Anterior
              </button>
              <span style={{ fontWeight: 600, color: "#334155" }}>
                Página {page} de {totalPages}
              </span>
              <button
                className="btn-paginacao"
                disabled={page >= totalPages || loading}
                onClick={() => carregarLogs(page + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Detalhes do Pedido Excluído */}
      {selectedLogId && (
        <div
          className="modal-overlay-excluidos"
          onClick={() => setSelectedLogId(null)}
        >
          <div
            className="modal-content-excluidos"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-excluidos">
              <h3>
                <FileText size={20} color="var(--primary-color)" /> Detalhes do Pedido
                Excluído #{detalhesDoc?.numeroPedido || selectedLogId}
              </h3>
              <button
                className="btn-fechar-modal"
                onClick={() => setSelectedLogId(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-excluidos">
              {loadingDetalhes ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  Carregando snapshot original do pedido...
                </div>
              ) : !detalhesDoc ? (
                <div style={{ color: "#dc2626" }}>Dados não encontrados.</div>
              ) : (
                <>
                  {/* Seção Auditoria */}
                  <div className="modal-section">
                    <span className="modal-section-title">Registro de Auditoria</span>
                    <div className="detalhe-box-motivo">
                      <strong>Motivo informado na exclusão:</strong>
                      <p style={{ margin: "4px 0 0 0" }}>{detalhesDoc.motivo}</p>
                    </div>

                    <div className="detalhes-grid" style={{ marginTop: "8px" }}>
                      <div className="detalhe-item">
                        <span className="detalhe-label">Excluído por</span>
                        <span className="detalhe-valor">
                          {detalhesDoc.excluidoPor?.nome} (
                          {detalhesDoc.excluidoPor?.setor || "Setor não informado"})
                        </span>
                      </div>
                      <div className="detalhe-item">
                        <span className="detalhe-label">E-mail</span>
                        <span className="detalhe-valor">
                          {detalhesDoc.excluidoPor?.email || "-"}
                        </span>
                      </div>
                      <div className="detalhe-item">
                        <span className="detalhe-label">Data e Hora da Exclusão</span>
                        <span className="detalhe-valor">
                          {formatarDataHora(detalhesDoc.excluidoEm)}
                        </span>
                      </div>
                      <div className="detalhe-item">
                        <span className="detalhe-label">Status da Auditoria</span>
                        <span className="detalhe-valor">
                          {detalhesDoc.restaurado ? (
                            <span style={{ color: "#16a34a" }}>
                              Restaurado em {formatarDataHora(detalhesDoc.restauradoEm)} por{" "}
                              {detalhesDoc.restauradoPor?.nome}
                            </span>
                          ) : (
                            <span style={{ color: "#dc2626" }}>Atualmente Excluído</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dados Originais do Pedido */}
                  {detalhesDoc.dadosOriginais && (
                    <>
                      <div className="modal-section">
                        <span className="modal-section-title">
                          Dados Gerais do Pedido
                        </span>
                        <div className="detalhes-grid">
                          <div className="detalhe-item">
                            <span className="detalhe-label">Cliente</span>
                            <span className="detalhe-valor">
                              {detalhesDoc.dadosOriginais.cliente?.nome ||
                                detalhesDoc.dadosOriginais.cliente ||
                                "-"}
                            </span>
                          </div>
                          <div className="detalhe-item">
                            <span className="detalhe-label">Telefone / Contato</span>
                            <span className="detalhe-valor">
                              {detalhesDoc.dadosOriginais.cliente?.telefone ||
                                detalhesDoc.dadosOriginais.telefone ||
                                "-"}
                            </span>
                          </div>
                          <div className="detalhe-item">
                            <span className="detalhe-label">Status Operacional</span>
                            <span className="detalhe-valor">
                              {detalhesDoc.dadosOriginais.statusAtual || "-"}
                            </span>
                          </div>
                          <div className="detalhe-item">
                            <span className="detalhe-label">Tipo de Serviço</span>
                            <span className="detalhe-valor">
                              {detalhesDoc.dadosOriginais.servico?.tipo || "-"}
                            </span>
                          </div>
                          <div className="detalhe-item">
                            <span className="detalhe-label">Valor Total</span>
                            <span className="detalhe-valor">
                              {formatarMoeda(
                                detalhesDoc.dadosOriginais.servico?.valorTotal ||
                                  detalhesDoc.dadosOriginais.valorTotal
                              )}
                            </span>
                          </div>
                          <div className="detalhe-item">
                            <span className="detalhe-label">Data de Criação</span>
                            <span className="detalhe-valor">
                              {formatarDataHora(detalhesDoc.dadosOriginais.criadoEm)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Observações e Descrição */}
                      <div className="modal-section">
                        <span className="modal-section-title">
                          Descrição / Observações do Pedido
                        </span>
                        <div
                          style={{
                            background: "#f8fafc",
                            padding: "12px",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            fontSize: "0.875rem",
                            color: "#334155",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {detalhesDoc.dadosOriginais.observacoes ||
                            detalhesDoc.dadosOriginais.descricao ||
                            detalhesDoc.dadosOriginais.servico?.descricao ||
                            "Nenhuma observação informada."}
                        </div>
                      </div>

                      {/* Histórico de Status */}
                      {Array.isArray(detalhesDoc.dadosOriginais.historicoStatus) && (
                        <div className="modal-section">
                          <span className="modal-section-title">
                            Histórico de Status Original (
                            {detalhesDoc.dadosOriginais.historicoStatus.length} eventos)
                          </span>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                              maxHeight: "180px",
                              overflowY: "auto",
                            }}
                          >
                            {detalhesDoc.dadosOriginais.historicoStatus.map(
                              (h: any, i: number) => (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "8px 12px",
                                    background: "#f8fafc",
                                    borderRadius: "6px",
                                    fontSize: "0.8125rem",
                                    border: "1px solid #f1f5f9",
                                  }}
                                >
                                  <div>
                                    <strong style={{ color: "var(--primary-color)" }}>
                                      {h.status}
                                    </strong>
                                    <span style={{ color: "#64748b", marginLeft: "6px" }}>
                                      por {h.responsavel || "Sistema"} ({h.setor || "-"})
                                    </span>
                                  </div>
                                  <span style={{ color: "#94a3b8" }}>
                                    {formatarDataHora(h.data)}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer-excluidos">
              <button
                className="btn-acao btn-detalhes"
                onClick={() => setSelectedLogId(null)}
              >
                Fechar
              </button>
              {detalhesDoc && !detalhesDoc.restaurado && (
                <button
                  className="btn-acao btn-restaurar"
                  onClick={() => {
                    setConfirmRestoreItem({
                      id: detalhesDoc.id,
                      pedidoId: detalhesDoc.pedidoId,
                      numeroPedido: detalhesDoc.numeroPedido,
                      motivo: detalhesDoc.motivo,
                      excluidoEm: detalhesDoc.excluidoEm,
                      restaurado: false,
                    });
                    setSelectedLogId(null);
                  }}
                >
                  <RotateCcw size={14} /> Restaurar Este Pedido
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de Restauração */}
      {confirmRestoreItem && (
        <div
          className="modal-overlay-excluidos"
          onClick={() => !restoring && setConfirmRestoreItem(null)}
        >
          <div
            className="modal-content-excluidos"
            style={{ maxWidth: "480px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-excluidos">
              <h3 style={{ color: "#166534" }}>
                <RotateCcw size={20} color="#16a34a" /> Restaurar Pedido
              </h3>
              <button
                className="btn-fechar-modal"
                onClick={() => !restoring && setConfirmRestoreItem(null)}
                disabled={restoring}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-excluidos" style={{ gap: "14px" }}>
              <p style={{ margin: 0, color: "#334155", fontSize: "0.9375rem" }}>
                Deseja restaurar o pedido{" "}
                <strong>
                  #{confirmRestoreItem.numeroPedido || confirmRestoreItem.pedidoId}
                </strong>{" "}
                de volta para o quadro de pedidos ativos?
              </p>
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  color: "#166534",
                }}
              >
                O pedido retornará ao Dashboard com todo o histórico preservado e uma nova
                etiqueta indicando que foi restaurado pela auditoria.
              </div>
            </div>

            <div className="modal-footer-excluidos">
              <button
                className="btn-acao btn-detalhes"
                onClick={() => setConfirmRestoreItem(null)}
                disabled={restoring}
              >
                Cancelar
              </button>
              <button
                className="btn-acao btn-restaurar"
                onClick={handleConfirmarRestauracao}
                disabled={restoring}
              >
                {restoring ? "Restaurando..." : "Confirmar Restauração"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

