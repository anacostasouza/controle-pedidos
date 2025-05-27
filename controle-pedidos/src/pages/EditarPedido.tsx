import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import HeaderPage from '../components/layout/headerPage';
import type { Pedido, StatusPedido } from "../types/Pedidos";
import "../styles/EditarPedido.css";

const statusPorServico: Record<string, StatusPedido[] | Record<string, StatusPedido[]>> = {
  "Arte": ["Iniciado", "Em Aprovação", "Concluído"],
  "Gráfica Rápida": {
    "Impressão Rápida": ["Impressão", "Concluído"],
    "Impressão com Acabamento": ["Impressão", "Acabamento", "Concluído"],
    "Carimbo": ["Impressão", "Montagem", "Concluído"],
    "Acabamento": ["Acabamento", "Concluído"]
  },
  "Impressão Digital": ["Impressão", "Acabamento", "Concluído"],
  "Comunicação Visual": {
    "Placa Simples": ["Corte e Preparação", "Montagem/Acabamento", "Concluído"],
    "Placa Complexa": ["Corte", "Estrutura", "Pintura", "Elétrica", "Montagem", "Concluído"]
  },
  "Terceirizado": ["Pedido Feito", "Acabamento", "Liberado"]
};

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
    
    const servico = pedido.servico.tipo as string;
    const subTipo = pedido.servico.subTipo;
    
    if (servico === "Gráfica Rápida" || servico === "Comunicação Visual") {
      const statusObj = statusPorServico[servico];
      if (typeof statusObj === "object" && !Array.isArray(statusObj)) {
        return statusObj[subTipo as string] ?? [];
      }
      return [];
    }
    
    return (statusPorServico[servico] as StatusPedido[]) || [];
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
      
      <h1>Editar Pedido #{pedido.numeroPedido}</h1>
      
      <div className="pedido-info">
        <p><strong>Cliente:</strong> {pedido.nomeCliente}</p>
        <p><strong>Serviço:</strong> {pedido.servico.tipo} {pedido.servico.subTipo && `(${pedido.servico.subTipo})`}</p>
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
    </div>
  );
}

