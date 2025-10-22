/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import HeaderPage from "../../components/layout/headerPage.tsx";
import { atualizarPedidoBackend, deletarPedidoBackend } from "../../services/ControlePedidosServices";
import { montarUpdatesParaBackend } from "./utils/utilsEditarPedido";

import type {
  Pedido,
  StatusPedido,
  StatusArte,
  StatusGalpao,
} from "../../types/Pedidos.ts";
import { TipoServicoLabels, TipoServico, getSubTipoServicoLabel } from "../../types/Servicos";
import type { SetorValue } from "../../types/Setores.ts";
import type { PedidoUpdateData, UserInfo } from "../../types/PedidoUpdates";
import { fetchPedidoById, fetchStatusSequence } from "../../utils/firestoreUtils";
import { capitalizeWords } from "../../utils/formatUtils";
import { generateTimeOptions } from "../../utils/timeUtils.ts";

import { db } from "../../services/firebase.ts";
import "../../styles/EditarPedido.css";

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
  const [error, setError] = useState<string>("");

  const [originalStatus, setOriginalStatus] = useState<StatusPedido | undefined>();
  const [originalStatusArte, setOriginalStatusArte] = useState<StatusArte | undefined>();
  const [originalStatusGalpao, setOriginalStatusGalpao] = useState<StatusGalpao | undefined>();
  const [originalDataEntrega, setOriginalDataEntrega] = useState<string>("");
  const [originalHorarioEntrega, setOriginalHorarioEntrega] = useState<string>("");

  const [statusServicos, setStatusServicos] = useState<Record<string, string[]>>({});

  const setoresPermitidosArte = ["ARTE", "SUPORTE", "GESTAO"];
  const setoresPermitidosGalpao = ["GALPAO", "SUPORTE", "GESTAO"];
  const setoresPermitidosStatusGeral = ["PRODUCAO_LOJA", "SUPORTE", "GESTAO"];
  const setoresPermitidosPrazoEntrega = ["SUPORTE", "GESTAO"];

  const podeEditarStatusArte = setoresPermitidosArte.includes(userSetor ?? "");
  const podeEditarStatusGalpao = setoresPermitidosGalpao.includes(userSetor ?? "");
  const podeEditarStatusGeral =
    setoresPermitidosStatusGeral.includes(userSetor ?? "") ||
    (pedido?.servico.tipo === TipoServico.TERCEIRIZADO && userDisplayName === pedido?.responsavel) ||
    (pedido?.servico.tipo === TipoServico.GRAFICA_RAPIDA && userDisplayName === pedido?.responsavel) ||
    (pedido?.servico.tipo === TipoServico.ARTE && userSetor === "ARTE");

  const podeEditarPrazoEntregaCalculado =
    userDisplayName === pedido?.responsavel || setoresPermitidosPrazoEntrega.includes(userSetor ?? "");

  // --- Busca usuário logado ---
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

  // --- Busca pedido completo e status ---
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

        // --- Status Geral ---
        const geralSequence = await fetchStatusSequence(data.servico.tipo, data.servico.subTipo ?? undefined);
        setStatusServicos((prev) => ({
          ...prev,
          [`${data.servico.tipo}-${data.servico.subTipo}`]: geralSequence,
        }));
        setNovoStatus(data.statusAtual);
        setOriginalStatus(data.statusAtual);

        // --- Status Arte ---
        if (data.requerArte) {
          const arteSequence = await fetchStatusSequence("ARTE");
          setStatusServicos((prev) => ({ ...prev, "ARTE-": arteSequence }));

          const ultimoStatusArte = data.StatusArte?.at(-1)?.status;
          setNovoStatusArte(ultimoStatusArte);
          setOriginalStatusArte(ultimoStatusArte);
        }

        // --- Status Galpão ---
        if (data.requerGalpao) {
          const galpaoSequence = await fetchStatusSequence("GALPAO", data.servico.subTipo ?? undefined);
          setStatusServicos((prev) => ({ ...prev, "GALPAO-": galpaoSequence }));

          const ultimoStatusGalpao = data.StatusGalpao?.at(-1)?.status;
          setNovoStatusGalpao(ultimoStatusGalpao);
          setOriginalStatusGalpao(ultimoStatusGalpao);
        }

        // --- Prazo de entrega ---
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
    if (!dataEntrega || !horarioEntrega) return true;
    
    const [year, month, day] = dataEntrega.split("-").map(Number);
    const [hours, minutes] = horarioEntrega.split(":").map(Number);
    
    const entregaDate = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();
    
    return entregaDate >= now;
  };

  // --- Atualiza pedido ---
  const handleUpdatePedido = async () => {
    setError("");
    
    if (!id || !pedido || userSetor === null || userDisplayName === null) {
      setError("Erro: Dados necessários para atualização não carregados.");
      return;
    }
    
    // Nova validação para data e horário
    if (dataEntrega !== originalDataEntrega || horarioEntrega !== originalHorarioEntrega) {
      if (!validarDataHorarioEntrega()) {
        setError("A data e horário de entrega não podem ser anteriores ao momento atual.");
        return;
      }
    }
    
    try {
      // Força renovação do token antes da operação
      const auth = getAuth();
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      
      const userInfo: UserInfo = { userSetor: userSetor as SetorValue, userDisplayName };

      const updateData: PedidoUpdateData = {
        novoStatusGeral: novoStatus,
        novoStatusArte:
          pedido.requerArte && pedido.servico.tipo !== TipoServico.ARTE ? novoStatusArte : undefined,
        novoStatusGalpao: pedido.requerGalpao ? novoStatusGalpao : undefined,
        novaDataEntrega: dataEntrega,
        novoHorarioEntrega: horarioEntrega,
      };

      const updates = await montarUpdatesParaBackend(userInfo, updateData);

      // Envie para o backend
      await atualizarPedidoBackend(id, updates);

      setError(""); // Limpar erro se houver
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      if (String(error).includes("expirada")) {
        setError("Sessão expirada. Redirecionando para login...");
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else if (String(error).includes("Sem permissão")) {
        setError("Você não tem permissão para atualizar alguns dos campos modificados.");
      } else {
        setError("Erro ao atualizar pedido: " + (error as Error).message);
      }
    }
  };

  // --- Excluir pedido ---
  const handleDelete = async () => {
    if (!id) return;
    if (!globalThis.confirm("Tem certeza que deseja excluir este pedido?")) return;

    try {
      await deletarPedidoBackend(id); 
      navigate("/dashboard");
    } catch (error) {
      setError("Erro ao excluir pedido: " + (error as Error).message);
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
    (pedido.requerArte && pedido.servico.tipo !== TipoServico.ARTE && novoStatusArte !== originalStatusArte) ||
    (pedido.requerGalpao && novoStatusGalpao !== originalStatusGalpao) ||
    dataEntrega !== originalDataEntrega ||
    horarioEntrega !== originalHorarioEntrega;

  return (
    <>
      <HeaderPage />
      <div className="editar-pedido-container">
        <div className="container-editar-pedido">
          <h1>Editar Pedido {pedido.numeroPedido}</h1>

          {/* Informações do Pedido */}
          <div className="pedido-info">
            <div className="info-row">
              <p>
                <strong>Cliente:</strong> {capitalizeWords(pedido.nomeCliente)}
              </p>
              <p>
                <strong>Serviço: </strong>
                {TipoServicoLabels[pedido.servico.tipo as TipoServico]}
                {pedido.servico.subTipo && ` (${getSubTipoServicoLabel(pedido.servico.subTipo)})`}
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

            {/* Prazo de entrega */}
            {podeEditarPrazoEntregaCalculado && (
              <div className="prazo-edicao-section">
                <h3>Prazo de Entrega</h3>
                <div className="form-group-prazo">
                  <label>Data:</label>
                  <input
                    type="date"
                    value={dataEntrega}
                    onChange={(e) => setDataEntrega(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="form-group-prazo">
                  <label>Horário:</label>
                  <select value={horarioEntrega} onChange={(e) => setHorarioEntrega(e.target.value)}>
                    {generateTimeOptions().map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {!validarDataHorarioEntrega() && (
                  <div className="warning-message">
                    Atenção: A data e horário selecionados são anteriores ao momento atual.
                    O pedido não poderá ser atualizado com esta configuração.
                  </div>
                )}
              </div>
            )}

            {/* Status Geral */}
            {podeEditarStatusGeral && (
              <div className="status-form">
                <label>Novo Status:</label>
                <select
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

            {/* Status Arte e Galpão */}
            {(pedido.requerArte && pedido.servico.tipo !== TipoServico.ARTE) ||
            (pedido.requerGalpao && podeEditarStatusGalpao) ? (
              <div id="arte-galpao">
                {pedido.requerArte && pedido.servico.tipo !== TipoServico.ARTE && podeEditarStatusArte && (
                  <div className="status-group-item">
                    <label>Status da Arte:</label>
                    <select
                      value={novoStatusArte}
                      onChange={(e) => setNovoStatusArte(e.target.value as StatusArte)}
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
                    <label>Status Galpão:</label>
                    <select
                      value={novoStatusGalpao}
                      onChange={(e) => setNovoStatusGalpao(e.target.value as StatusGalpao)}
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

          {error && <div className="error-message">{error}</div>}

          {/* Botão Atualizar */}
          <button onClick={handleUpdatePedido} disabled={!hasChanges} className="update-button">
            Atualizar Pedido
          </button>

          {/* Histórico de status */}
          <div className="historico">
            <h3>Histórico de Status</h3>
            <ul>
              {pedido.historicoStatus?.map((item, index) => (
                <li key={`${item.status}-${item.data?.seconds ?? index}-${item.responsavel}`}>
                  <strong>{item.status}</strong> - {item.data?.toDate().toLocaleString()} por {item.responsavel}
                </li>
              ))}
            </ul>
          </div>

          {/* Ações */}
          <div className="actions">
            <button className="back-button" onClick={() => navigate("/dashboard")}>
              Voltar para Dashboard
            </button>
            <button className="delete-button" onClick={handleDelete}>
              Excluir Pedido
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
