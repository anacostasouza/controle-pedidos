/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import HeaderPage from "../../components/layout/headerPage.tsx";
import {
  atualizarPedidoBackend,
  deletarPedidoBackend,
} from "../../services/ControlePedidosServices";
import { montarUpdatesParaBackend } from "./utils/utilsEditarPedido";

import type {
  Pedido,
  StatusPedido,
  StatusArte,
  StatusGalpao,
} from "../../types/Pedidos.ts";
import {
  TipoServicoLabels,
  TipoServico,
  getSubTipoServicoLabel,
} from "../../types/Servicos";
import type { SetorValue } from "../../types/Setores.ts";
import type { PedidoUpdateData, UserInfo } from "../../types/PedidoUpdates";
import {
  fetchPedidoById,
  fetchStatusSequence,
} from "../../utils/FirestoreUtils";
import { capitalizeWords } from "../../utils/FormatUtils";
import { generateTimeOptions } from "../../utils/TimeUtils.ts";

import { db } from "../../services/firebase.ts";
import "../../styles/EditarPedido.css";

export default function EditarPedido() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [novoStatus, setNovoStatus] = useState<StatusPedido | undefined>();
  const [novoStatusArte, setNovoStatusArte] = useState<
    StatusArte | undefined
  >();
  const [novoStatusGalpao, setNovoStatusGalpao] = useState<
    StatusGalpao | undefined
  >();
  const [loading, setLoading] = useState(true);
  const [userSetor, setUserSetor] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userUID, setUserUID] = useState<string | null>(null);
  const [dataEntrega, setDataEntrega] = useState<string>("");
  const [horarioEntrega, setHorarioEntrega] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [originalStatus, setOriginalStatus] = useState<
    StatusPedido | undefined
  >();
  const [originalStatusArte, setOriginalStatusArte] = useState<
    StatusArte | undefined
  >();
  const [originalStatusGalpao, setOriginalStatusGalpao] = useState<
    StatusGalpao | undefined
  >();
  const [originalDataEntrega, setOriginalDataEntrega] = useState<string>("");
  const [originalHorarioEntrega, setOriginalHorarioEntrega] =
    useState<string>("");

  const [statusServicos, setStatusServicos] = useState<
    Record<string, string[]>
  >({});

  const setoresPermitidosArte = ["ARTE", "SUPORTE", "GESTAO"];
  const setoresPermitidosGalpao = ["GALPAO", "SUPORTE", "GESTAO"];
  const setoresPermitidosStatusGeral = ["PRODUCAO_LOJA", "SUPORTE", "GESTAO"];
  const setoresPermitidosPrazoEntrega = ["SUPORTE", "GESTAO"];


  const podeEditarStatusArte = setoresPermitidosArte.includes(userSetor ?? "");
  const podeEditarStatusGalpao = setoresPermitidosGalpao.includes(
    userSetor ?? ""
  );

  const podeEditarStatusGeral =
    setoresPermitidosStatusGeral.includes(userSetor ?? "") ||
    (pedido?.servico.tipo === TipoServico.TERCEIRIZADO && (userDisplayName === pedido?.responsavel || userUID === pedido?.responsavelUid)) ||
    (pedido?.servico.tipo === TipoServico.GRAFICA_RAPIDA && (userDisplayName === pedido?.responsavel || userUID === pedido?.responsavelUid)) ||
    (pedido?.servico.tipo === TipoServico.ARTE && userSetor === "ARTE");

  const podeEditarPrazoEntregaCalculado =
    userDisplayName === pedido?.responsavel || userUID === pedido?.responsavelUid ||
    setoresPermitidosPrazoEntrega.includes(userSetor ?? "");

  useEffect(() => {
    const fetchUserSetorAndDisplayName = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("Usuário não autenticado. Redirecionando para login.");
        navigate("/");
        return;
      }

      try {
        const docRef = doc(db, "usuarios", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const usuarioData = docSnap.data();
          setUserDisplayName(usuarioData.displayName ?? null);
          setUserUID(currentUser.uid);
          setUserSetor(usuarioData.setor ?? null);
          
        } else {
          setError("Usuário não encontrado. Redirecionando.");
          navigate("/");
        }
      } catch (error) {
        setError("Erro ao buscar dados do usuário.");
        navigate("/");
      }
    };

    fetchUserSetorAndDisplayName();
  }, [navigate]);
  

  useEffect(() => {
    const fetchPedidoEStatus = async () => {
      if (!id) return;
      setLoading(true);

      try {
        const data = await fetchPedidoById(id);
        if (!data) {
          setError("Pedido não encontrado.");
          navigate("/dashboard");
          return;
        }

        setPedido(data);

        const geralSequence = await fetchStatusSequence(
          data.servico.tipo,
          data.servico.subTipo ?? undefined
        );
        setStatusServicos((prev) => ({
          ...prev,
          [`${data.servico.tipo}-${data.servico.subTipo}`]: geralSequence,
        }));
        setNovoStatus(data.statusAtual);
        setOriginalStatus(data.statusAtual);

        if (data.requerArte) {
          const arteSequence = await fetchStatusSequence("ARTE");
          setStatusServicos((prev) => ({ ...prev, "ARTE-": arteSequence }));

          const ultimoStatusArte = data.StatusArte?.at(-1)?.status;
          setNovoStatusArte(ultimoStatusArte);
          setOriginalStatusArte(ultimoStatusArte);
        }

        if (data.requerGalpao) {
          const galpaoSequence = await fetchStatusSequence(
            "GALPAO",
            data.servico.subTipo ?? undefined
          );
          setStatusServicos((prev) => ({ ...prev, "GALPAO-": galpaoSequence }));

          const ultimoStatusGalpao = data.StatusGalpao?.at(-1)?.status;
          setNovoStatusGalpao(ultimoStatusGalpao);
          setOriginalStatusGalpao(ultimoStatusGalpao);
        }

        if (data.prazos?.entrega) {
          const entregaDate = data.prazos.entrega.toDate();
          const year = entregaDate.getFullYear();
          const month = String(entregaDate.getMonth() + 1).padStart(2, "0");
          const day = String(entregaDate.getDate()).padStart(2, "0");

          const formattedDate = `${year}-${month}-${day}`;
          setDataEntrega(formattedDate);
          setOriginalDataEntrega(formattedDate);

          const hora = data.horarioRetirada ?? "08:00";
          setHorarioEntrega(hora);
          setOriginalHorarioEntrega(hora);
        }
      } catch (error) {
        setError("Erro ao carregar pedido.");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
  
    fetchPedidoEStatus();
  }, [id, navigate]);

  const validarDataHorarioEntrega = (): boolean => {
    if (!dataEntrega || !horarioEntrega) {
      setError("Data e horário de entrega são obrigatórios.");
      return false;
    }

    const [year, month, day] = dataEntrega.split("-").map(Number);
    const [hours, minutes] = horarioEntrega.split(":").map(Number);

    const entregaDate = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();

    return entregaDate >= now;
  };

  const handleUpdatePedido = async () => {
    setError("");
    setSuccessMessage("");

    if (!id || !pedido || userSetor === null || userDisplayName === null || userUID === null) {
      setError("Erro: Dados necessários para atualização não carregados.");
      return;
    }

    const mudouDataOuHorario = 
      dataEntrega !== originalDataEntrega || 
      horarioEntrega !== originalHorarioEntrega;
    
    if (mudouDataOuHorario) {
      if (!dataEntrega || !horarioEntrega) {
        setError("Data e horário de entrega são obrigatórios.");
        return;
      }
      
      if (!validarDataHorarioEntrega()) {
        setError("A data e horário de entrega não podem ser anteriores ao momento atual.");
        return;
      }
    }

    try {
      const auth = getAuth();
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      const userInfo: UserInfo = {
        userSetor: userSetor as SetorValue,
        userDisplayName,
        userUID,
      };

      const updateData: PedidoUpdateData = {
        novoStatusGeral: novoStatus !== originalStatus ? novoStatus : undefined,
        novoStatusArte:
          pedido.requerArte &&
          pedido.servico.tipo !== TipoServico.ARTE &&
          novoStatusArte !== originalStatusArte
            ? novoStatusArte
            : undefined,
        novoStatusGalpao:
          pedido.requerGalpao && novoStatusGalpao !== originalStatusGalpao
            ? novoStatusGalpao
            : undefined,
        // Enviar ambos se qualquer um mudou
        novaDataEntrega: mudouDataOuHorario ? dataEntrega : undefined,
        novoHorarioEntrega: mudouDataOuHorario ? horarioEntrega : undefined,
      };

      const updates = await montarUpdatesParaBackend(userInfo, updateData);

      await atualizarPedidoBackend(id, updates);

      setSuccessMessage("Pedido atualizado com sucesso!");
      setError("");

      setOriginalStatus(novoStatus);
      setOriginalStatusArte(novoStatusArte);
      setOriginalStatusGalpao(novoStatusGalpao);
      setOriginalDataEntrega(dataEntrega);
      setOriginalHorarioEntrega(horarioEntrega);

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);

      const errorMessage = String(error);

      if (
        errorMessage.includes("Sessão expirada") ||
        errorMessage.includes("401")
      ) {
        setError("Sessão expirada. Redirecionando para login...");
        setTimeout(() => navigate("/"), 2000);
      } else if (
        errorMessage.includes("Sem permissão") ||
        errorMessage.includes("403")
      ) {
        setError(
          "Você não tem permissão para realizar esta operação. Verifique com o administrador."
        );
      } else if (
        errorMessage.includes("Pedido não encontrado") ||
        errorMessage.includes("404")
      ) {
        setError("Pedido não encontrado.");
      } else {
        setError(
          `Erro ao atualizar pedido: ${
            (error as Error).message || "Erro desconhecido"
          }`
        );
      }
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleConfirmDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    setError("");

    try {
      await deletarPedidoBackend(id);
      setSuccessMessage("Pedido excluído com sucesso!");
      setShowDeleteModal(false);

      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      setError("Erro ao excluir pedido: " + (error as Error).message);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (!pedido) return <div>Pedido não encontrado</div>;

  const keyServico = `${pedido.servico.tipo}-${pedido.servico.subTipo}`;
  const statusDisponiveis = statusServicos[keyServico] ?? [];
  const statusDisponiveisArte = statusServicos["ARTE-"] ?? ["Aguardando"];
  const statusDisponiveisGalpao = statusServicos["GALPAO-"] ?? ["Em Produção"];

  const hasChanges =
    novoStatus !== originalStatus ||
    (pedido.requerArte &&
      pedido.servico.tipo !== TipoServico.ARTE &&
      novoStatusArte !== originalStatusArte) ||
    (pedido.requerGalpao && novoStatusGalpao !== originalStatusGalpao) ||
    dataEntrega !== originalDataEntrega ||
    horarioEntrega !== originalHorarioEntrega;

  return (
    <>
      <HeaderPage />
      <div className="editar-pedido-container">
        <div className="container-editar-pedido">
          <h1>Editar Pedido {pedido.numeroPedido}</h1>

          {successMessage && (
            <div className="success-message">{successMessage}</div>
          )}
          {error && <div className="error-message">{error}</div>}

          <div className="pedido-info">
            <div className="info-row">
              <p>
                <strong>Cliente:</strong> {capitalizeWords(pedido.nomeCliente)}
              </p>
              <p>
                <strong>Serviço: </strong>
                {TipoServicoLabels[pedido.servico.tipo as TipoServico]}
                {pedido.servico.subTipo &&
                  ` (${getSubTipoServicoLabel(pedido.servico.subTipo)})`}
              </p>
            </div>

            <div className="info-row">
              <p>
                <strong>Status Atual:</strong> {pedido.statusAtual}
              </p>
              <p>
                <strong>Responsável do Pedido:</strong> {pedido.responsavel}
              </p>
            </div>

            {podeEditarPrazoEntregaCalculado && (
              <div className="prazo-edicao-section">
                <h3>Prazo de Entrega</h3>
                <div className="form-group-prazo">
                  <label htmlFor="date">Data:</label>
                  <input
                    id="date"
                    type="date"
                    value={dataEntrega}
                    onChange={(e) => setDataEntrega(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="form-group-prazo">
                  <label htmlFor="horario">Horário:</label>
                  <select
                    id="horario"
                    value={horarioEntrega}
                    onChange={(e) => setHorarioEntrega(e.target.value)}
                  >
                    {generateTimeOptions().map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {!validarDataHorarioEntrega() && (
                  <div className="warning-message">
                    Atenção: A data e horário selecionados são anteriores ao
                    momento atual. O pedido não poderá ser atualizado com esta
                    configuração.
                  </div>
                )}
              </div>
            )}

            {podeEditarStatusGeral && (
              
              <div className="status-form">
                <label htmlFor="novoStatus">Novo Status:</label>
                <select
                  id="novoStatus"
                  value={novoStatus}
                  onChange={(e) => setNovoStatus(e.target.value as StatusPedido)}
                >
                  {statusDisponiveis.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(pedido.requerArte && pedido.servico.tipo !== TipoServico.ARTE) ||
            (pedido.requerGalpao && podeEditarStatusGalpao) ? (
              <div id="arte-galpao">
                {pedido.requerArte &&
                  pedido.servico.tipo !== TipoServico.ARTE &&
                  podeEditarStatusArte && (
                    <div className="status-group-item">
                      <label htmlFor="status-arte">Status da Arte:</label>
                      <select
                        id="status-arte"
                        value={novoStatusArte}
                        onChange={(e) =>
                          setNovoStatusArte(e.target.value as StatusArte)
                        }
                      >
                        {statusDisponiveisArte.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                {pedido.requerGalpao && podeEditarStatusGalpao && (
                  <div className="status-group-item">
                    <label htmlFor="status-galpao">Status Galpão:</label>
                    <select
                      id="status-galpao"
                      value={novoStatusGalpao}
                      onChange={(e) =>
                        setNovoStatusGalpao(e.target.value as StatusGalpao)
                      }
                    >
                      {statusDisponiveisGalpao.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
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
                <li
                  key={`${item.status}-${item.data?.seconds ?? index}-${
                    item.responsavel
                  }`}
                >
                  <strong>{item.status}</strong> -{" "}
                  {item.data?.toDate().toLocaleString()} por {item.responsavel}
                </li>
              ))}
            </ul>
          </div>

          <div className="actions">
            <button
              className="back-button"
              onClick={() => navigate("/dashboard")}
            >
              Voltar para Dashboard
            </button>
            <button className="delete-button" onClick={handleDeleteClick}>
              Excluir Pedido
            </button>
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                width="80px"
                height="80px"
                viewBox="0 0 28 28"
                version="1.1"
              >
                <g
                  id="trashIcon1"
                  stroke="none"
                  strokeWidth="1"
                  fill="none"
                  fillRule="evenodd"
                >
                  <g
                    id="trashIcon2"
                    fill="#5f1919"
                    fillRule="nonzero"
                  >
                    <path
                      d="M19.5,16 C22.5375661,16 25,18.4624339 25,21.5 C25,24.5375661 22.5375661,27 19.5,27 C16.4624339,27 14,24.5375661 14,21.5 C14,18.4624339 16.4624339,16 19.5,16 Z M14,2 C16.1421954,2 17.8910789,3.68396847 17.9951047,5.80035966 L18,6 L23,6 C23.5522847,6 24,6.44771525 24,7 C24,7.51283584 23.6139598,7.93550716 23.1166211,7.99327227 L23,8 L22.151,8 L21.5567191,15.3321126 C20.910333,15.1166725 20.2187917,15 19.5,15 C15.9101491,15 13,17.9101491 13,21.5 C13,23.2469007 13.6891263,24.8328473 14.8103588,26.0008195 L10.7666018,26 C8.81304683,26 7.18674613,24.5002245 7.02886788,22.5530595 L5.848,8 L5,8 C4.48716416,8 4.06449284,7.61395981 4.00672773,7.11662113 L4,7 C4,6.48716416 4.38604019,6.06449284 4.88337887,6.00672773 L5,6 L10,6 C10,3.790861 11.790861,2 14,2 Z M17.7309061,19.0241379 L17.6616582,18.9662824 C17.4911486,18.8481609 17.2635568,18.8481609 17.0930472,18.9662824 L17.0237993,19.0241379 L16.9659438,19.0933858 C16.8478223,19.2638954 16.8478223,19.4914871 16.9659438,19.6619968 L17.0237993,19.7312446 L18.7933527,21.5006913 L17.0263884,23.2674911 L16.968533,23.3367389 C16.8504114,23.5072486 16.8504114,23.7348403 16.968533,23.9053499 L17.0263884,23.9745978 L17.0956363,24.0324533 C17.2661459,24.1505748 17.4937377,24.1505748 17.6642473,24.0324533 L17.7334952,23.9745978 L19.5003527,22.2076913 L21.2693951,23.9768405 L21.338643,24.0346959 C21.5091526,24.1528175 21.7367444,24.1528175 21.907254,24.0346959 L21.9765019,23.9768405 L22.0343574,23.9075926 C22.1524789,23.737083 22.1524789,23.5094912 22.0343574,23.3389816 L21.9765019,23.2697337 L20.2073527,21.5006913 L21.9792686,19.7312918 L22.0371241,19.6620439 C22.1552456,19.4915343 22.1552456,19.2639425 22.0371241,19.0934329 L21.9792686,19.024185 L21.9100208,18.9663296 C21.7395111,18.848208 21.5119194,18.848208 21.3414098,18.9663296 L21.2721619,19.024185 L19.5003527,20.7936913 L17.7309061,19.0241379 L17.6616582,18.9662824 L17.7309061,19.0241379 Z M14,4 C12.9456382,4 12.0818349,4.81587779 12.0054857,5.85073766 L12,6 L16,6 L15.9945143,5.85073766 C15.9181651,4.81587779 15.0543618,4 14,4 Z"
                      id="trashIcon3"
                    ></path>
                  </g>
                </g>
              </svg>
            </div>
            <h2>Confirmar Exclusão</h2>
            <p>
              Tem certeza que deseja excluir o pedido{" "}
              <strong>{pedido.numeroPedido}</strong>?
            </p>
            <p className="modal-warning">Esta ação não pode ser desfeita!</p>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                className="btn-delete"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Excluindo..." : "Excluir Pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
