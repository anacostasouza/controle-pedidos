import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";
import "../styles/Dashboard.css";
import HeaderPage from '../components/layout/headerPage';
import type { Pedido } from '../types/Pedidos';
import { TipoServicoLabels, SubTipoServicoLabels, SubTipoServico, TipoServico } from '../types/Servicos';
import { formatDate, filtrarPedidos, isPedidoAtrasado } from "../utils/dashboardUtils";

export default function Dashboard() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [filtroServico, setFiltroServico] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroAtrasados, setFiltroAtrasados] = useState(false);
  const [pedidosFiltrados, setPedidosFiltrados] = useState<Pedido[]>([]);
  const userSetor = (localStorage.getItem("userSetor") ?? "").toUpperCase();

  const podeEditarPedido = (pedido: Pedido): boolean => {
    console.log("Verificando permissões para o setor:", userSetor);

    if (pedido.servico.tipo === TipoServico.COMUNICACAO_VISUAL && userSetor === "GALPAO") return true;
    if (pedido.servico.tipo === TipoServico.ARTE && userSetor === "ARTE") return true;

    if (userSetor === "GESTAO" || userSetor === "SUPORTE" || userSetor === "PRODUCAO_LOJA") return true;
    if (pedido.requerArte === true && userSetor === "ARTE") return true;
    if (pedido.requerGalpao === true && userSetor === "GALPAO") return true;


    return false;
  };


  useEffect(() => {
    const fetchPedidos = async () => {
      const db = getFirestore();
      const q = query(collection(db, "pedidos"), orderBy("prazos.entrega"));
      const pedidosSnapshot = await getDocs(q);
      
      const pedidosData = pedidosSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Pedido[];
      
      setPedidos(pedidosData);
      setPedidosFiltrados(pedidosData);
      setLoading(false);
    };

    fetchPedidos();
  }, []);

  useEffect(() => {
  const pedidosFiltrados = filtrarPedidos(
    pedidos,
    buscaCliente,
    filtroServico,
    filtroStatus,
    filtroAtrasados
  );
  setPedidosFiltrados(pedidosFiltrados);
  }, [pedidos, buscaCliente, filtroServico, filtroStatus, filtroAtrasados]);



  return (
    <div className="dashboard-page">
      <HeaderPage />
      
      <div className="table-container">
        <div className="header-dashboard">
          <h2>Pedidos ({pedidos.length}) </h2>
          <div className="filters">
            <input
              type="text"
              placeholder="Buscar cliente..."
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
            </select>
            <label>
              <input
                type="checkbox"
                checked={filtroAtrasados}
                onChange={(e) => setFiltroAtrasados(e.target.checked)}
              />
               Mostrar apenas pedidos atrasados
            </label>
            <button 
            className="new-order-button" 
            onClick={() => navigate("/novo-pedido")}
            >
              Novo Pedido
            </button>
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
                  <th>Serviço</th>
                  <th>Prazo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((pedido) => (
                  <tr key={pedido.id} className="pedidos-row">
                    <td>{pedido.numeroPedido}</td>
                    <td>{pedido.nomeCliente}</td>
                    <td>
                      {TipoServicoLabels[pedido.servico.tipo] ?? pedido.servico.tipo}
                      {pedido.servico.subTipo && SubTipoServicoLabels[pedido.servico.subTipo as SubTipoServico]
                        ? ` (${SubTipoServicoLabels[pedido.servico.subTipo as SubTipoServico]})`
                        : pedido.servico.subTipo
                        ? ` (${pedido.servico.subTipo})`
                        : ""}
                    </td>
                    <td>
                      {formatDate(pedido.prazos.entrega)}
                      {isPedidoAtrasado(pedido.prazos.entrega) && (
                        <span className="atrasado-alert">Atrasado!</span>
                      )}
                    </td>
                    <td>{pedido.statusAtual}</td>
                    <td>
                      {podeEditarPedido(pedido) ? (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}