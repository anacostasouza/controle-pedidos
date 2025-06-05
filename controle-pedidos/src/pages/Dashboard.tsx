import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import "../styles/Dashboard.css";
import HeaderPage from '../components/layout/headerPage';
import type { Pedido } from '../types/Pedidos';
import { TipoServicoLabels, SubTipoServicoLabels, SubTipoServico } from "../types/Servicos";



export default function Dashboard() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const userSetor = (localStorage.getItem("userSetor") ?? "").toUpperCase();

  const podeEditarPedido = (pedido: Pedido): boolean => {
    console.log("Verificando permissões para o setor:", userSetor);
    if (userSetor === "GESTAO" || userSetor === "SUPORTE" || userSetor === "PRODUCAO_LOJA") return true;
    if (pedido.requerArte && userSetor === "ARTE") return true;
    if (pedido.requerGalpao && userSetor === "GALPAO") return true;
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
      setLoading(false);
    };

    fetchPedidos();
  }, []);

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return "-";
    return timestamp.toDate().toLocaleDateString('pt-BR');
  };

  return (
    <div className="dashboard-page">
      <HeaderPage />
      
      <div className="table-container">
        <div className="header-dashboard">
          <h2>Pedidos ({pedidos.length}) </h2>
          <button 
            className="new-order-button" 
            onClick={() => navigate("/novo-pedido")}
          >
          Novo Pedido
          </button>
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
              {pedidos.map((pedido) => (
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