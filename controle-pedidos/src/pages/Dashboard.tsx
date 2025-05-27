import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import "../styles/Dashboard.css";
import HeaderPage from '../components/layout/headerPage';
import type { Pedido } from "../types/Pedidos";

export default function Dashboard() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const userSetor = localStorage.getItem("userSetor") ?? "";
 

  // Verifica se o usuário pode editar o status de um pedido específico
  const podeEditarPedido = (pedido: Pedido) => {
    // Administradores podem editar qualquer pedido
    if (["gestao", "suporte"].includes(userSetor)) return true;
    
    // Se o pedido tem setores específicos, verifica se o usuário pertence a um deles
    if (pedido.setoresResponsaveis && pedido.setoresResponsaveis.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return pedido.setoresResponsaveis.includes(userSetor as any);
    }
    
    // Caso padrão (pedidos antigos sem setores específicos)
    return ["producao_loja", "producao_galpao"].includes(userSetor);
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
        <h2>Pedidos</h2>
        
        <button 
          className="new-order-button" 
          onClick={() => navigate("/novo-pedido")}
        >
        Novo Pedido
        </button>
        
        {loading ? (
          <div className="loading">Carregando pedidos...</div>
        ) : (
          <table>
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
                <tr key={pedido.id}>
                  <td>{pedido.numeroPedido}</td>
                  <td>{pedido.nomeCliente}</td>
                  <td>
                    {pedido.servico.tipo}
                    {pedido.servico.subTipo && ` (${pedido.servico.subTipo})`}
                    {pedido.requerArte && <span className="badge arte">Arte</span>}
                    {pedido.requerGalpao && <span className="badge galpao">Galpão</span>}
                  </td>
                  <td>{formatDate(pedido.prazos.entrega)}</td>
                  <td>{pedido.statusAtual}</td>
                  <td>
                    {podeEditarPedido(pedido) && (
                      <button 
                        onClick={() => navigate(`/editar-pedido/${pedido.id}`)}
                        className="action-button"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}