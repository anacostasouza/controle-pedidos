import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; 

import HeaderPage from "../components/layout/headerPage.tsx";

import type { Pedido, StatusPedido, StatusArte, StatusGalpao } from "../types/Pedidos.ts";
import { TipoServicoLabels, TipoServico, getSubTipoServicoLabel } from "../types/Servicos"; 
import type { SetorValue } from "../types/Setores.ts";
import type { PedidoUpdateData, UserInfo } from "../types/PedidoUpdates";

import {
  fetchPedidoById,
  deletarPedidoPorId,
  atualizarPedidoCompleto,
  getStatusDisponiveis,
  getStatusArteDisponiveis,
  getStatusGalpaoDisponiveis,
} from "../utils/utilsEditarPedido";

import { db } from "../services/firebase";
import { capitalizeWords } from "../utils/formatUtils";
import "../styles/EditarPedido.css";

const generateTimeOptions = (interval: number = 30) => {
  const options = [];
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const value = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      options.push({ value, label: value });
    }
  }
  return options;
};

export default function EditarPedido() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [novoStatus, setNovoStatus] = useState<StatusPedido | undefined>();
  const [novoStatusArte, setNovoStatusArte] = useState<StatusArte | undefined>();
  const [novoStatusGalpao, setNovoStatusGalpao] = useState<StatusGalpao | undefined>();
  const [loading, setLoading] = useState(true);
  const [userSetor, setUserSetor] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [dataEntrega, setDataEntrega] = useState<string>("");
  const [horarioEntrega, setHorarioEntrega] = useState<string>("");

  const [originalStatus, setOriginalStatus] = useState<StatusPedido | undefined>();
  const [originalStatusArte, setOriginalStatusArte] = useState<StatusArte | undefined>();
  const [originalStatusGalpao, setOriginalStatusGalpao] = useState<StatusGalpao | undefined>();
  const [originalDataEntrega, setOriginalDataEntrega] = useState<string>("");
  const [originalHorarioEntrega, setOriginalHorarioEntrega] = useState<string>("");

  const setoresPermitidosArte = ["ARTE", "SUPORTE", "GESTAO"];
  const setoresPermitidosGalpao = ["GALPAO", "SUPORTE", "GESTAO"];
  const setoresPermitidosStatusGeral = ["PRODUCAO_LOJA", "SUPORTE", "GESTAO"];
  const setoresPermitidosPrazoEntrega = ["SUPORTE", "GESTAO"];

  const podeEditarStatusArte = setoresPermitidosArte.includes(userSetor ?? "");
  const podeEditarStatusGalpao = setoresPermitidosGalpao.includes(userSetor ?? "");
  // Agora a verificação de serviço terceirizado é feita diretamente no tipo do serviço do pedido
  const podeEditarStatusGeral =
    setoresPermitidosStatusGeral.includes(userSetor ?? "") ||
    (pedido?.servico.tipo === TipoServico.TERCEIRIZADO && userDisplayName === pedido?.responsavel);
  const podeEditarPrazoEntregaCalculado =
    userDisplayName === pedido?.responsavel || setoresPermitidosPrazoEntrega.includes(userSetor ?? "");

  useEffect(() => {
    const fetchUserSetorAndDisplayName = async () => {
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
          setUserDisplayName(usuarioData.displayName);
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

    fetchUserSetorAndDisplayName();
  }, [navigate]);

  useEffect(() => {
    const carregarPedido = async () => {
      if (!id) return;
      setLoading(true);
      const pedidoCarregado = await fetchPedidoById(id);

      if (pedidoCarregado) {
        setPedido(pedidoCarregado);
        setNovoStatus(pedidoCarregado.statusAtual);
        setOriginalStatus(pedidoCarregado.statusAtual);

        if (pedidoCarregado.prazos?.entrega) {
          const entregaDate = pedidoCarregado.prazos.entrega.toDate();
          const year = entregaDate.getFullYear();
          const month = (entregaDate.getMonth() + 1).toString().padStart(2, '0');
          const day = entregaDate.getDate().toString().padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          setDataEntrega(formattedDate);
          setOriginalDataEntrega(formattedDate);

          const hora = pedidoCarregado.horarioRetirada ?? "08:00";
          setHorarioEntrega(hora);
          setOriginalHorarioEntrega(hora);
        } else {
          setDataEntrega("");
          setOriginalDataEntrega("");
          setHorarioEntrega("08:00");
          setOriginalHorarioEntrega("08:00");
        }

        if (pedidoCarregado.requerArte) {
          const ultimoStatusArte = pedidoCarregado.StatusArte?.at(-1)?.status;
          setNovoStatusArte(ultimoStatusArte);
          setOriginalStatusArte(ultimoStatusArte);
        } else {
          setNovoStatusArte(undefined);
          setOriginalStatusArte(undefined);
        }

        if (pedidoCarregado.requerGalpao) {
          const ultimoStatusGalpao = pedidoCarregado.StatusGalpao?.at(-1)?.status;
          setNovoStatusGalpao(ultimoStatusGalpao);
          setOriginalStatusGalpao(ultimoStatusGalpao);
        } else {
          setNovoStatusGalpao(undefined);
          setOriginalStatusGalpao(undefined);
        }
      }
      setLoading(false);
    };

    carregarPedido();
  }, [id]);

  const handleUpdatePedido = async () => {
    if (!id || !pedido || userSetor === null || userDisplayName === null) {
      alert("Erro: Dados necessários para atualização não carregados.");
      return;
    }

    if (novoStatus !== undefined && novoStatus !== originalStatus) {
      const canEditGeneralStatusNow =
        setoresPermitidosStatusGeral.includes(userSetor) ||
        (pedido.servico.tipo === TipoServico.TERCEIRIZADO && userDisplayName === pedido.responsavel);
      if (!canEditGeneralStatusNow) {
        alert("Você não tem permissão para alterar o status geral do pedido.");
        setNovoStatus(originalStatus);
        return;
      }
    }

    if (pedido.requerArte && novoStatusArte !== undefined && novoStatusArte !== originalStatusArte && !podeEditarStatusArte) {
      alert("Você não tem permissão para alterar o status da arte.");
      setNovoStatusArte(originalStatusArte);
      return;
    }

    if (pedido.requerGalpao && novoStatusGalpao !== undefined && novoStatusGalpao !== originalStatusGalpao && !podeEditarStatusGalpao) {
      alert("Você não tem permissão para alterar o status do galpão.");
      setNovoStatusGalpao(originalStatusGalpao);
      return;
    }

    const isDateChanged = dataEntrega !== originalDataEntrega;
    const isTimeChanged = horarioEntrega !== originalHorarioEntrega;

    if (isDateChanged || isTimeChanged) {
      if (!podeEditarPrazoEntregaCalculado) {
        alert("Você não tem permissão para alterar o prazo de entrega.");
        setDataEntrega(originalDataEntrega);
        setHorarioEntrega(originalHorarioEntrega);
        return;
      }
      if (dataEntrega && !horarioEntrega) {
        alert("O horário de entrega é obrigatório se a data for preenchida.");
        return;
      }
      if (!dataEntrega && horarioEntrega && horarioEntrega !== "08:00") {
        alert("A data de entrega é obrigatória se o horário for preenchido (e não for o padrão '08:00'). Para remover o prazo, limpe ambos os campos.");
        return;
      }
    }

    const userInfo: UserInfo = {
      userSetor: userSetor as SetorValue,
      userDisplayName,
    };

    const updateData: PedidoUpdateData = {
      novoStatusGeral: novoStatus,
      novoStatusArte: pedido.requerArte ? novoStatusArte : undefined,
      novoStatusGalpao: pedido.requerGalpao ? novoStatusGalpao : undefined,
      novaDataEntrega: dataEntrega,
      novoHorarioEntrega: horarioEntrega,
    };

    try {
      await atualizarPedidoCompleto(id, pedido, userInfo, updateData);
      alert("Pedido atualizado com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      alert("Erro ao atualizar pedido: " + (error as Error).message);
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

  const statusDisponiveis = getStatusDisponiveis(pedido);
  const statusDisponiveisArte = getStatusArteDisponiveis();
  const statusDisponiveisGalpao = getStatusGalpaoDisponiveis();

  const hasChanges =
    novoStatus !== originalStatus ||
    (pedido.requerArte && novoStatusArte !== originalStatusArte) ||
    (pedido.requerGalpao && novoStatusGalpao !== originalStatusGalpao) ||
    dataEntrega !== originalDataEntrega ||
    horarioEntrega !== originalHorarioEntrega;

  return (
    <>
      <div className="HeaderPage">
        <HeaderPage />
      </div>
      <div className="editar-pedido-container">
        <div className="container-editar-pedido">
          <h1>Editar Pedido {pedido.numeroPedido}</h1>
          <div className="pedido-info">
            <div className="info-row">
              <p><strong>Cliente:</strong> {capitalizeWords(pedido.nomeCliente)}</p>
              <p><strong>Serviço: </strong>{TipoServicoLabels[pedido.servico.tipo as TipoServico]}{pedido.servico.subTipo && ` (${getSubTipoServicoLabel(pedido.servico.subTipo)})`}</p>
            </div>
            <div className="info-row">
              <p><strong>Status Atual:</strong> {pedido.statusAtual}</p>
              <p><strong>Responsável do Pedido:</strong> {pedido.responsavel}</p>
            </div>
            {/* Exibe se o serviço é terceirizado com base no tipo do serviço */}
            {pedido.servico.tipo === TipoServico.TERCEIRIZADO && (
              <div className="info-row">
                <p><strong>Serviço Terceirizado:</strong> Sim</p>
              </div>
            )}

            {podeEditarPrazoEntregaCalculado && (
              <div className="prazo-edicao-section">
                <h3>Prazo de Entrega</h3>
                <div className="form-group-prazo">
                  <div className="form-group-item">
                    <label htmlFor="data-entrega-input">Data:</label>
                    <input
                      id="data-entrega-input"
                      type="date"
                      value={dataEntrega}
                      onChange={(e) => setDataEntrega(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>
                <div className="form-group-prazo">
                  <div className="form-group-item">
                    <label htmlFor="horario-entrega-select">Horário:</label>
                    <select
                      id="horario-entrega-select"
                      value={horarioEntrega}
                      onChange={(e) => setHorarioEntrega(e.target.value)}
                    >
                      {generateTimeOptions().map((time) => (
                        <option key={time.value} value={time.value}>{time.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {podeEditarStatusGeral && (
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
            )}

            {(pedido.requerArte && podeEditarStatusArte) || (pedido.requerGalpao && podeEditarStatusGalpao) ? (
              <div id="arte-galpao">
                {pedido.requerArte && podeEditarStatusArte && (
                  <div className="status-group-item">
                    <label htmlFor="status-arte-select">Status da Arte:</label>
                    <select
                      id="status-arte-select"
                      value={novoStatusArte}
                      onChange={(e) => setNovoStatusArte(e.target.value as StatusArte)}
                    >
                      {statusDisponiveisArte.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                )}

                {pedido.requerGalpao && podeEditarStatusGalpao && (
                  <div className="status-group-item">
                    <label htmlFor="status-galpao-select">Status Galpão:</label>
                    <select
                      id="status-galpao-select"
                      value={novoStatusGalpao}
                      onChange={(e) => setNovoStatusGalpao(e.target.value as StatusGalpao)}
                    >
                      {statusDisponiveisGalpao.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <button
            onClick={handleUpdatePedido}
            disabled={!hasChanges}
            className="update-button"
          >
            Atualizar Pedido
          </button>

          <div className="historico">
            <h3>Histórico de Status</h3>
            <ul>
              {pedido.historicoStatus?.map((item, index) => (
                <li key={`${item.status}-${item.data?.seconds ?? index}-${item.responsavel}`}>
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
    </>
  );
}