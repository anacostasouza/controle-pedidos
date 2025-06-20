import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, query, orderBy, doc, getDoc, onSnapshot, updateDoc, Timestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "../styles/Dashboard.css";
import HeaderPage from '../components/layout/headerPage';
import type { Pedido, StatusPedido } from '../types/Pedidos';
import { TipoServicoLabels, SubTipoServicoLabels, TipoServico, SubTipoServico } from '../types/Servicos';
import { formatDate, filtrarPedidos, isPedidoAtrasado, isStatusPedido } from "../utils/dashboardUtils";
import { getEtapaAtual } from "../utils/statusUtils";
import { getStatusDisponiveis, getStatusArteDisponiveis, getStatusGalpaoDisponiveis } from "../utils/utilsEditarPedido";
import { capitalizeWords } from "../utils/formatUtils";

export default function Dashboard() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [filtroServico, setFiltroServico] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroAtrasados, setFiltroAtrasados] = useState(false);
  const [filtroRequerArte, setFiltroRequerArte] = useState("");
  const [filtroRequerGalpao, setFiltroRequerGalpao] = useState("");
  const [pedidosFiltrados, setPedidosFiltrados] = useState<Pedido[]>([]);
  const [userSetor, setUserSetor] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserSetor((userData.setor ?? "").toUpperCase());
          setUserDisplayName(userData.displayName ?? "");
        } else {
          console.warn("Usuário não encontrado no Firestore.");
        }
      } else {
        console.warn("Usuário não autenticado.");
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    const db = getFirestore();
    const pedidosCollectionRef = collection(db, "pedidos");
    const q = query(pedidosCollectionRef, orderBy("prazos.entrega", "asc"));

    const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
      const pedidosData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        criadoEm: doc.data().criadoEm instanceof Timestamp ? doc.data().criadoEm : new Timestamp(doc.data().criadoEm?.seconds || 0, doc.data().criadoEm?.nanoseconds || 0),
        atualizadoEm: doc.data().atualizadoEm instanceof Timestamp ? doc.data().atualizadoEm : new Timestamp(doc.data().atualizadoEm?.seconds || 0, doc.data().atualizadoEm?.nanoseconds || 0),
        prazos: {
          ...doc.data().prazos,
          entrega: doc.data().prazos?.entrega instanceof Timestamp ? doc.data().prazos.entrega : new Timestamp(doc.data().prazos?.entrega?.seconds || 0, doc.data().prazos?.entrega?.nanoseconds || 0),
          producao: doc.data().prazos?.producao instanceof Timestamp ? doc.data().prazos.producao : (doc.data().prazos?.producao ? new Timestamp(doc.data().prazos?.producao?.seconds || 0, doc.data().prazos?.producao?.nanoseconds || 0) : undefined),
          arte: doc.data().prazos?.arte instanceof Timestamp ? doc.data().prazos.arte : (doc.data().prazos?.arte ? new Timestamp(doc.data().prazos?.arte?.seconds || 0, doc.data().prazos?.arte?.nanoseconds || 0) : undefined),
        },
        entregueEm: doc.data().entregueEm instanceof Timestamp ? doc.data().entregueEm : (doc.data().entregueEm ? new Timestamp(doc.data().entregueEm?.seconds || 0, doc.data().entregueEm?.nanoseconds || 0) : undefined),
        historicoStatus: doc.data().historicoStatus || [],
        StatusArte: doc.data().StatusArte || [],
        StatusGalpao: doc.data().StatusGalpao || [],
        ...doc.data()
      })) as Pedido[];

      setPedidos(pedidosData);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar pedidos em tempo real:", error);
      setLoading(false);
    });

    return () => unsubscribeFirestore();
  }, []);

  useEffect(() => {
    const pedidosFiltrados = filtrarPedidos(
      pedidos,
      buscaCliente,
      filtroServico,
      filtroStatus,
      filtroAtrasados,
      userSetor === "ARTE" ? filtroRequerArte : "",
      userSetor === "GALPAO" ? filtroRequerGalpao : "",
      userSetor
    );
    setPedidosFiltrados(pedidosFiltrados);
  }, [pedidos, buscaCliente, filtroServico, filtroStatus, filtroAtrasados, filtroRequerArte, filtroRequerGalpao, userSetor]);

  const podeEditarPedido = (pedido: Pedido): boolean => {
    if (!userSetor) return false;

    if (pedido.statusAtual === "Entregue") return false;

    if (pedido.servico.tipo === TipoServico.COMUNICACAO_VISUAL && userSetor === "GALPAO") return true;
    if (pedido.servico.tipo === TipoServico.ARTE && userSetor === "ARTE") return true;
    if (userSetor === "GESTAO" || userSetor === "SUPORTE" || userSetor === "PRODUCAO_LOJA") return true;
    if (pedido.requerArte === true && userSetor === "ARTE") return true;
    if (pedido.requerGalpao === true && userSetor === "GALPAO") return true;

    return false;
  };

  const handleMarcarComoEntregue = async (pedidoId: string, currentStatus: StatusPedido) => {
    if (userSetor !== "CAIXA" && userSetor !== "BALCAO") {
      alert("Você não tem permissão para marcar pedidos como entregues.");
      return;
    }

    if (currentStatus !== "Concluído") {
      alert("Apenas pedidos com status 'Concluído' podem ser marcados como entregues.");
      return;
    }

    if (window.confirm("Tem certeza que deseja marcar este pedido como ENTREGUE?")) {
      const db = getFirestore();
      const pedidoRef = doc(db, "pedidos", pedidoId);
      const now = Timestamp.now();

      try {
        await updateDoc(pedidoRef, {
          statusAtual: "Entregue",
          entregueEm: now,
          atualizadoEm: now,
          historicoStatus: [
            ...(pedidos.find(p => p.id === pedidoId)?.historicoStatus || []),
            {
              status: "Entregue",
              data: now,
              responsavel: userDisplayName,
              setor: userSetor,
            },
          ],
        });
        alert("Pedido marcado como Entregue com sucesso!");
      } catch (error) {
        console.error("Erro ao marcar pedido como entregue:", error);
        alert("Erro ao marcar pedido como entregue. Tente novamente.");
      }
    }
  };

  // Verifica se há pelo menos um pedido que o usuário pode editar ou marcar como entregue
  const shouldShowActionsColumn = pedidosFiltrados.some(pedido =>
    (pedido.statusAtual === "Concluído" && (userSetor === "CAIXA" || userSetor === "BALCAO")) || podeEditarPedido(pedido)
  );

  return (
    <div className="dashboard-page">
      <HeaderPage />

      <div className="table-container">
        <div className="header-dashboard">
          <div className="dashboard-header-content">
            <h2>Pedidos ({pedidosFiltrados.length}) </h2>
            <button
              className="new-order-button"
              onClick={() => navigate("/novo-pedido")}
            >
              Novo Pedido
            </button>
          </div>

          <div className="filters">
            <input
              type="text"
              placeholder="Buscar cliente ou nº do pedido..."
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
            />
            <select
              aria-label="Filtro de serviço"
              value={filtroServico}
              onChange={(e) => setFiltroServico(e.target.value)}
            >
              <option value="">Todos os serviços</option>
              {Object.entries(TipoServicoLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtro de status"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="Iniciado">Iniciado</option>
              <option value="Em Aprovação">Em Aprovação</option>
              <option value="Concluído">Concluído</option>
              <option value="Impressão">Impressão</option>
              <option value="Acabamento">Acabamento</option>
              <option value="Montagem">Montagem</option>
              <option value="Pedido Feito">Pedido Feito</option>
              <option value="Liberado">Liberado</option>
              <option value="Corte">Corte</option>
              <option value="Estrutura">Estrutura</option>
              <option value="Pintura">Pintura</option>
              <option value="Elétrica">Elétrica</option>
              <option value="Corte e Preparação">Corte e Preparação</option>
              <option value="Montagem/Acabamento">Montagem/Acabamento</option>
              {(userSetor === "CAIXA" || userSetor === "BALCAO") && <option value="Entregue">Entregue</option>}
            </select>

            {userSetor === "ARTE" && (
              <select
                aria-label="Filtro de Requer Arte"
                value={filtroRequerArte}
                onChange={(e) => setFiltroRequerArte(e.target.value)}
              >
                <option value="">Requer Arte (Todos)</option>
                <option value="true">Requer Arte (Sim)</option>
                <option value="false">Requer Arte (Não)</option>
              </select>
            )}

            {userSetor === "GALPAO" && (
              <select
                aria-label="Filtro de Requer Galpão"
                value={filtroRequerGalpao}
                onChange={(e) => setFiltroRequerGalpao(e.target.value)}
              >
                <option value="">Requer Galpão (Todos)</option>
                <option value="true">Requer Galpão (Sim)</option>
                <option value="false">Requer Galpão (Não)</option>
              </select>
            )}

            <label>
              <input
                type="checkbox"
                checked={filtroAtrasados}
                onChange={(e) => setFiltroAtrasados(e.target.checked)}
              />{" "}
              Mostrar apenas pedidos atrasados
            </label>
          </div>
        </div>
        {loading ? (
          <div className="loading">Carregando pedidos...</div>
        ) : (
          <div className="table-responsive">
            <table className="pedidos-table">
              <thead>
                <tr>
                  <th>Nº Pedido</th>
                  <th>Cliente</th>
                  <th>Responsável</th>
                  <th>Serviço</th>
                  <th>Prazo</th>
                  <th>Etapas</th>
                  <th>Status</th>
                  {shouldShowActionsColumn && (
                    <th>Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((pedido) => {
                  const statusDisponiveis = getStatusDisponiveis(pedido);
                  const etapaAtual = getEtapaAtual(pedido.statusAtual, statusDisponiveis);

                  const statusArteHist = pedido.StatusArte?.at(-1);
                  const statusAtualArte = statusArteHist?.status;

                  const statusDisponiveisArte = pedido.requerArte && isStatusPedido(statusAtualArte)
                    ? getStatusArteDisponiveis(pedido)
                    : [];

                  const etapaAtualArte = pedido.requerArte && isStatusPedido(statusAtualArte)
                    ? getEtapaAtual(statusAtualArte, statusDisponiveisArte)
                    : null;

                  const statusGalpaoHist = pedido.StatusGalpao?.at(-1);
                  const statusAtualGalpao = statusGalpaoHist?.status;

                  const statusDisponiveisGalpao = pedido.requerGalpao && isStatusPedido(statusAtualGalpao)
                    ? getStatusGalpaoDisponiveis(pedido)
                    : [];

                  const etapaAtualGalpao = pedido.requerGalpao && isStatusPedido(statusAtualGalpao)
                    ? getEtapaAtual(statusAtualGalpao, statusDisponiveisGalpao)
                    : null;

                  return (
                    <tr key={pedido.id} className="pedidos-row">
                      <td>{pedido.numeroPedido}</td>
                      <td>{capitalizeWords(pedido.nomeCliente)}</td>
                      <td>{pedido.responsavel}</td>
                      <td>
                        {TipoServicoLabels[pedido.servico.tipo] ?? pedido.servico.tipo}
                        {(() => {
                          let subTipoLabel = "";
                          if (pedido.servico.subTipo && SubTipoServicoLabels[pedido.servico.subTipo as SubTipoServico]) {
                            subTipoLabel = `(${SubTipoServicoLabels[pedido.servico.subTipo as SubTipoServico]})`;
                          } else if (pedido.servico.subTipo) {
                            subTipoLabel = ` (${pedido.servico.subTipo})`;
                          }
                          return subTipoLabel;
                        })()}
                      </td>
                      <td>
                        {formatDate(pedido.prazos.entrega)}
                        {isPedidoAtrasado(pedido.prazos.entrega) && (
                          <span className="atrasado-alert">Atrasado!</span>
                        )}
                      </td>
                      <td>
                        <div>
                          <span><strong>Geral:</strong> {etapaAtual}/{statusDisponiveis.length}</span><br />
                          {pedido.requerArte && (
                            <span><strong>Arte:</strong> {etapaAtualArte}/{statusDisponiveisArte.length}</span>
                          )}<br />
                          {pedido.requerGalpao && (
                            <span><strong>Galpão:</strong> {etapaAtualGalpao}/{statusDisponiveisGalpao.length}</span>
                          )}
                        </div>
                      </td>
                      <td>{pedido.statusAtual}</td>
                      {shouldShowActionsColumn && (
                        <td>
                          {pedido.statusAtual === "Concluído" && (userSetor === "CAIXA" || userSetor === "BALCAO") ? (
                            <button
                              className="entregar-button"
                              onClick={() => pedido.id && handleMarcarComoEntregue(pedido.id, pedido.statusAtual)}
                            >
                              Entregue
                            </button>
                          ) : podeEditarPedido(pedido) ? (
                            <button
                              className="edit-button"
                              onClick={() => navigate(`/editar-pedido/${pedido.id}`)}
                            >
                              Editar
                            </button>
                          ) : (
                            <span className="no-edit-permission">Sem permissão</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}