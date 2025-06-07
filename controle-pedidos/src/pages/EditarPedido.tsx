import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderPage from "../components/layout/headerPage";
import type { Pedido, StatusPedido } from "../types/Pedidos";
import "../styles/EditarPedido.css";
import {
  fetchPedidoById,
  deletarPedidoPorId,
  atualizarStatusPedido,
  getStatusDisponiveis,
  getStatusArteDisponiveis,
  getStatusGalpaoDisponiveis,
} from "../utils/utilsEditarPedido";
import type { StatusArte, StatusGalpao } from "../utils/statusUtils";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function EditarPedido() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [novoStatus, setNovoStatus] = useState<StatusPedido>();
  const [novoStatusArte, setNovoStatusArte] = useState<StatusArte>();
  const [novoStatusGalpao, setNovoStatusGalpao] = useState<StatusGalpao>();
  const [loading, setLoading] = useState(true);
  const [userSetor, setUserSetor] = useState<string | null>(null);

  const setoresPermitidosArte = ["ARTE", "SUPORTE", "GESTAO"];
  const setoresPermitidosGalpao = ["GALPAO", "SUPORTE", "GESTAO"];

  const podeEditarStatusArte = setoresPermitidosArte.includes(userSetor ?? "");
  const podeEditarStatusGalpao = setoresPermitidosGalpao.includes(userSetor ?? "");

  useEffect(() => {
    const fetchUserSetor = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("Usuário não autenticado. Redirecionando para login.");
        navigate("/");
        return;
      }

      try {
        const docRef = doc(db, "usuarios", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const usuarioData = docSnap.data();
          setUserSetor(usuarioData.setor);
        } else {
          alert("Usuário não encontrado. Redirecionando.");
          navigate("/");
        }
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        alert("Erro ao buscar dados do usuário.");
        navigate("/");
      }
    };

    fetchUserSetor();
  }, [navigate]);

  useEffect(() => {
    const carregarPedido = async () => {
      if (!id) return;
      const pedidoCarregado = await fetchPedidoById(id);
      if (pedidoCarregado) {
        setPedido(pedidoCarregado);
        setNovoStatus(pedidoCarregado.statusAtual);

        if (pedidoCarregado.requerArte) {
          const ultimoStatusArte = pedidoCarregado.StatusArte?.at(-1)?.status;
          setNovoStatusArte(ultimoStatusArte);
        }

        if (pedidoCarregado.requerGalpao) {
          const ultimoStatusGalpao = pedidoCarregado.StatusGalpao?.at(-1)?.status;
          setNovoStatusGalpao(ultimoStatusGalpao);
        }
      }
      setLoading(false);
    };

    carregarPedido();
  }, [id]);

  const handleStatusChange = async () => {
    if (!id || !pedido || !novoStatus || !userSetor) return;

    try {
      await atualizarStatusPedido(
        id,
        pedido,
        novoStatus,
        userSetor,
        pedido.requerArte ? (novoStatusArte as StatusArte) : undefined,
        pedido.requerGalpao ? (novoStatusGalpao as StatusGalpao) : undefined
      );

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
  const statusDisponiveisArte: StatusArte[] = getStatusArteDisponiveis();
  const statusDisponiveisGalpao: StatusGalpao[] = getStatusGalpaoDisponiveis();

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
        </div>

        {pedido.requerArte && (
          <div className="status-form">
            <label htmlFor="status-arte-select">Status da Arte:</label>
            <select
              id="status-arte-select"
              value={novoStatusArte}
              onChange={(e) => setNovoStatusArte(e.target.value as StatusArte)}
              disabled={!podeEditarStatusArte}
            >
              {statusDisponiveisArte.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            {!podeEditarStatusArte && (
              <p className="status-warning">Você não tem permissão para alterar o status da arte.</p>
            )}
          </div>
        )}

        {pedido.requerGalpao && (
          <div className="status-form">
            <label htmlFor="status-galpao-select">Status Galpão:</label>
            <select
              id="status-galpao-select"
              value={novoStatusGalpao}
              onChange={(e) => setNovoStatusGalpao(e.target.value as StatusGalpao)}
              disabled={!podeEditarStatusGalpao}
            >
              {statusDisponiveisGalpao.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            {!podeEditarStatusGalpao && (
              <p className="status-warning">Você não tem permissão para alterar o status do galpão.</p>
            )}
          </div>
        )}

        <button 
          onClick={handleStatusChange}
          disabled={
            novoStatus === pedido.statusAtual &&
            (!pedido.requerArte || novoStatusArte === pedido.StatusArte?.at(-1)?.status) &&
            (!pedido.requerGalpao || novoStatusGalpao === pedido.StatusGalpao?.at(-1)?.status)
          }
          className="update-button"
        >
          Atualizar Status
        </button>

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
