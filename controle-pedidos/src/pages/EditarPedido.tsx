import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderPage from '../components/layout/headerPage';
import type { Pedido, StatusPedido } from "../types/Pedidos";
import "../styles/EditarPedido.css";
import {
  fetchPedidoById,
  deletarPedidoPorId,
  atualizarStatusPedido,
  getStatusDisponiveis
} from "../utils/utilsEditarPedido";


export default function EditarPedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [novoStatus, setNovoStatus] = useState<StatusPedido>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarPedido = async () => {
      if (!id) return;
      const pedidoCarregado = await fetchPedidoById(id);
      if (pedidoCarregado) {
        setPedido(pedidoCarregado);
        setNovoStatus(pedidoCarregado.statusAtual);
      }
      setLoading(false);
    };
    carregarPedido();
  }, [id]);

  const handleStatusChange = async () => {
    if (!id || !pedido || !novoStatus) return;

    try {
      const userSetor = localStorage.getItem("setor") ?? "Sistema";
      await atualizarStatusPedido(id, pedido, novoStatus, userSetor);
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmacao = window.confirm("Tem certeza que deseja excluir este pedido?");
    if (!confirmacao) return;

    try {
      await deletarPedidoPorId(id);
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao excluir pedido:", error);
      alert("Erro ao excluir pedido");
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (!pedido) return <div>Pedido não encontrado</div>;

  const statusDisponiveis: StatusPedido[] = getStatusDisponiveis(pedido);

  return (
    <div className="editar-pedido-container">
      <HeaderPage />
      <div className="container-editar-pedido">
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
            {statusDisponiveis.map((status) => (
              <option key={status} value={status}>{status}</option>
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
          <button className="back-button" onClick={() => navigate("/dashboard")}>Voltar para Dashboard</button>
          <button className="delete-button" onClick={handleDelete}>Excluir Pedido</button>
        </div>
      </div>
    </div>
  );
}
