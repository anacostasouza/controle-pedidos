import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import HeaderPage from '../components/layout/headerPage';
import type { Pedido, StatusPedido } from "../types/Pedidos";
import "../styles/EditarPedido.css";
import { TipoServicoLabels, SubTipoServicoLabels } from '../types/Servicos';
import { statusPorServico } from "../types/StatusPedidos";

export default function EditarPedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [novoStatus, setNovoStatus] = useState<StatusPedido>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPedido = async () => {
      if (!id) return;
      
      const db = getFirestore();
      const docRef = doc(db, "pedidos", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setPedido(docSnap.data() as Pedido);
        setNovoStatus(docSnap.data().statusAtual);
      }
      setLoading(false);
    };

    fetchPedido();
  }, [id]);

  const getStatusDisponiveis = (): StatusPedido[] => {
    if (!pedido) return [];
    
    const  tipoLabel = TipoServicoLabels[pedido.servico.tipo];
    const subTipoLabel = pedido.servico.subTipo ? pedido.servico.subTipo : undefined;

    const statusEntry = statusPorServico[tipoLabel];

    if (
      typeof statusEntry === "object" && 
      !Array.isArray(statusEntry) &&
      subTipoLabel
    ) {
      return statusEntry[subTipoLabel] ?? [];
    }
    return Array.isArray(statusEntry) ? statusEntry : [];
  };

  const handleStatusChange = async () => {
    if (!id || !pedido || !novoStatus) return;
    
    try {
      const db = getFirestore();
      const pedidoRef = doc(db, "pedidos", id);
      const now = Timestamp.now();
      const user = localStorage.getItem("profileName") ?? "Sistema";
      
      await updateDoc(pedidoRef, {
        statusAtual: novoStatus,
        historicoStatus: [
          ...pedido.historicoStatus,
          {
            status: novoStatus,
            data: now,
            responsavel: user
          }
        ],
        atualizadoEm: now
      });
      
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status");
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (!pedido) return <div>Pedido não encontrado</div>;

  const statusDisponiveis: StatusPedido[] = getStatusDisponiveis();

  return (
    <div className="editar-pedido-container">
      <HeaderPage />
      <div className="container-editar-pedido">
        <h1>Editar Pedido #{pedido.numeroPedido}</h1>
        
        <div className="pedido-info">
          <p><strong>Cliente:</strong> {pedido.nomeCliente}</p>
          <p><strong>Serviço:</strong> {TipoServicoLabels[pedido.servico.tipo] ?? pedido.servico.tipo} {pedido.servico.subTipo && `(${pedido.servico.subTipo})`}</p>
          <p><strong>Status Atual:</strong> {pedido.statusAtual}</p>
        </div>

        <div className="status-form">
          <label htmlFor="novo-status-select">Novo Status:</label>
          <select
            id="novo-status-select"
            value={novoStatus}
            onChange={(e) => setNovoStatus(e.target.value as StatusPedido)}
          >
            {statusDisponiveis.map((status: StatusPedido) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          
          <button 
            onClick={handleStatusChange}
            disabled={novoStatus === pedido.statusAtual}
            className="update-button"
          >
            Atualizar Status
          </button>
        </div>

        <div className="historico">
          <h3>Histórico de Status</h3>
          <ul>
            {pedido.historicoStatus.map((item) => (
              <li key={`${item.status}-${item.data?.seconds ?? ''}-${item.responsavel}`}>
                <strong>{item.status}</strong> - {item.data.toDate().toLocaleString()} por {item.responsavel}
              </li>
            ))}
          </ul>
        </div>
        <div className="actions">
          <button className="back-button" onClick={() => navigate("/dashboard")}>
            Voltar para Dashboard
          </button>
          <button className="delete-button" onClick={() => {
            if (window.confirm("Tem certeza que deseja excluir este pedido?")) {
              // Lógica para excluir o pedido
              alert("Pedido excluído (lógica de exclusão não implementada)");
            }
          }
          }>
            Excluir Pedido
          </button>
        </div>
      </div>
    </div>
  );
}

