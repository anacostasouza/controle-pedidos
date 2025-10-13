import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getFirestore,
  collection,
  Timestamp,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { TipoServico, SubTipoServico } from "../types/Servicos";
import { tiposServico } from "../types/tipoServicos";
import { setores, type SetorValue } from "../types/Setores";
import type { Pedido } from "../types/Pedidos";

import { fetchStatusSequence } from "../utils/firestoreUtils";
import { generateTimeOptions } from "../utils/timeUtils";
import HeaderPage from "../components/layout/headerPage";
import { criarPedido } from "../services/ControlePedidosServices";

import "../styles/NovoPedido.css";

// ------------------------------
// Interfaces
// ------------------------------
interface UserOption {
  uid: string;
  displayName: string;
  setor: string;
}

// ------------------------------
// Componente principal
// ------------------------------
export default function NovoPedido() {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();
  const location = useLocation();

  // ------------------------------
  // Estados principais
  // ------------------------------
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userSetorLabel, setUserSetorLabel] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>("");
  const [retrabalho, setRetrabalho] = useState(false);

  const [error, setError] = useState("");

  const params = new URLSearchParams(window.location.search);
  const numeroPedidoParam = params.get("numeroPedido");
  const numeroPedido = numeroPedidoParam
    ? Number(numeroPedidoParam)
    : undefined;

  const [formData, setFormData] = useState<
    Omit<Pedido, "id" | "criadoEm" | "atualizadoEm" | "historicoStatus">
  >({
    pedidoID: Math.floor(Math.random() * 9000) + 1000,
    numeroPedido: numeroPedido || 0,
    nomeCliente: "",
    servico: { tipo: "" as unknown as TipoServico, servicoID: 0 },
    responsavel: "",
    statusAtual: "Iniciado",
    prazos: { entrega: Timestamp.now(), arte: null },
    tipoDeEntrega: "Entrega",
    horarioRetirada: "08:00",
    requerArte: false,
    requerGalpao: false,
    setoresResponsaveis: [],
  });

  const paramsURL = new URLSearchParams(location.search);

  const nomeCliente = paramsURL.get("nomeCliente") || "";
  const atendimentoId = paramsURL.get("atendimentoId") || "";
  const origem = paramsURL.get("origem") || "";
  const numeroPedidoState = paramsURL.get("codigoPedido") || "";
  const codigoClienteOmieParam = paramsURL.get("codigoClienteOmie");
  const codigoClienteOmie = codigoClienteOmieParam
    ? Number(codigoClienteOmieParam)
    : undefined;

  // ------------------------------
  // Busca usuário logado + lista de usuários
  // ------------------------------
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingUser(true);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("Usuário não autenticado. Redirecionando para login.");
        navigate("/");
        return;
      }

      try {
        // Dados do usuário logado
        const userDocRef = doc(db, "usuarios", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const currentUserName = userData.displayName;
          setUserDisplayName(currentUserName);

          const setorEncontrado = setores.find(
            (setor) =>
              setor.value.trim().toUpperCase() ===
              userData.setor.trim().toUpperCase()
          );
          const currentUserSetor = setorEncontrado?.label ?? userData.setor;
          setUserSetorLabel(currentUserSetor);

          setFormData((prev) => ({
            ...prev,
            responsavel: currentUserName,
          }));
          setSelectedResponsavel(currentUser.uid);
        } else {
          alert("Dados do usuário não encontrados. Redirecionando.");
          navigate("/");
          return;
        }

        // Lista de todos usuários
        const usersCollectionRef = collection(db, "usuarios");
        const usersSnapshot = await getDocs(usersCollectionRef);

        const fetchedUsers: UserOption[] = [];
        usersSnapshot.forEach((docSnap) => {
          const userData = docSnap.data();
          fetchedUsers.push({
            uid: docSnap.id,
            displayName: userData.displayName,
            setor: userData.setor,
          });
        });

        const sortedUsers = fetchedUsers.sort((a, b) =>
          a.displayName.localeCompare(b.displayName)
        );
        setUsers(sortedUsers);
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        alert("Erro ao carregar dados. Tente novamente.");
        navigate("/");
      } finally {
        setLoadingUser(false);
      }
    };

    fetchInitialData();
  }, [auth, db, navigate]);

  // ------------------------------
  // Ao inicializar o formData, já preencha nomeCliente se vier do state
  useEffect(() => {
    if (nomeCliente) {
      setFormData((prev) => ({
        ...prev,
        nomeCliente,
      }));
    }
  }, [nomeCliente]);

  useEffect(() => {
    if (numeroPedidoState) {
      setFormData((prev) => ({
        ...prev,
        numeroPedido: parseInt(numeroPedidoState, 10),
      }));
    }
  }, [numeroPedidoState]);

  // ------------------------------
  // Funções de validação
  // ------------------------------
  const validateForm = (): boolean => {
    if (formData.numeroPedido <= 0) {
      setError("Número do pedido inválido");
      return false;
    }
    if (formData.nomeCliente.trim().length < 3) {
      setError("Nome do cliente deve ter pelo menos 3 caracteres");
      return false;
    }
    if (!formData.prazos.entrega) {
      setError("Data de entrega é obrigatória");
      return false;
    }
    if (formData.requerArte && !formData.prazos.arte) {
      setError(
        "Data de entrega da arte é obrigatória quando 'Requer Criação de Arte' está selecionado."
      );
      return false;
    }
    if (
      formData.requerArte &&
      formData.prazos.arte &&
      formData.prazos.entrega &&
      formData.prazos.arte.toDate() > formData.prazos.entrega.toDate()
    ) {
      setError(
        "A data de entrega da arte não pode ser maior que a data de entrega do pedido."
      );
      return false;
    }
    if (!selectedResponsavel) {
      setError("Por favor, selecione um responsável para o pedido.");
      return false;
    }

    const tipoServicoSelecionado = tiposServico.find(
      (s) => s.value === formData.servico.tipo
    );
    if (tipoServicoSelecionado?.subTipos && !formData.servico.subTipo) {
      setError("Por favor, selecione um subtipo para o serviço escolhido.");
      return false;
    }

    return true;
  };

  // ------------------------------
  // Handle Submit
  // ------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (loadingUser) {
      setError("Aguarde, carregando dados do usuário...");
      return;
    }
    if (userDisplayName === null || userSetorLabel === null) {
      setError("Dados do usuário não carregados completamente.");
      return;
    }
    if (!validateForm()) return;

    const selectedResponsibleUser = users.find(
      (user) => user.uid === selectedResponsavel
    );
    if (!selectedResponsibleUser) {
      setError("Responsável selecionado inválido.");
      return;
    }

    try {
      // Definição de setores responsáveis
      const setoresResponsaveis: SetorValue[] = ["PRODUCAO_LOJA"];
      if (formData.requerArte) setoresResponsaveis.push("ARTE");
      if (formData.requerGalpao) setoresResponsaveis.push("GALPAO");

      // Ajuste do horário na data de entrega
      const [hours, minutes] = (formData.horarioRetirada ?? "08:00").split(":");
      const entregaDate = formData.prazos.entrega.toDate();
      entregaDate.setHours(parseInt(hours), parseInt(minutes));

      const servicoToSave = {
        tipo: formData.servico.tipo,
        servicoID: formData.servico.servicoID,
        ...(formData.servico.subTipo !== undefined
          ? { subTipo: formData.servico.subTipo }
          : {}),
      };

      const prazosToSave: Pedido["prazos"] = {
        entrega: Timestamp.fromDate(entregaDate),
        arte: formData.requerArte ? formData.prazos.arte : null,
      };

      // Busca status inicial dinamicamente
      let statusInicial = "Iniciado";
      try {
        const sequence = await fetchStatusSequence(
          formData.servico.tipo,
          formData.servico.subTipo ?? ""
        );
        if (sequence.length > 0) statusInicial = sequence[0];
      } catch (err) {
        console.error("Erro ao buscar status inicial:", err);
      }

      // Gravação no Firestore
      await criarPedido({
        formData: {
          ...formData,
          responsavelUid: selectedResponsibleUser?.uid ?? "",
        },
        selectedResponsibleUser,
        setoresResponsaveis,
        prazosToSave,
        servicoToSave,
        statusInicial,
        userDisplayName,
        userSetorLabel,
        origem,
        atendimentoId,
        codigoClienteOmie,
        retrabalho,
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao cadastrar pedido:", error);
      setError("Erro ao cadastrar pedido. Tente novamente.");
    }
  };

  // ------------------------------
  // Effect para sincronizar prazo de arte com entrega
  // ------------------------------
  useEffect(() => {
    const tipoArte = tiposServico.find(
      (s) => s.label.toLowerCase() === "arte"
    )?.value;
    if (formData.servico.tipo === tipoArte && formData.prazos.entrega) {
      setFormData((prev) => ({
        ...prev,
        prazos: {
          ...prev.prazos,
          arte: prev.prazos.entrega,
        },
      }));
    }
  }, [formData.servico.tipo, formData.prazos.entrega]);

  // ------------------------------
  // Render
  // ------------------------------
  if (loadingUser) return <div>Carregando dados do usuário...</div>;

  return (
    <div>
      <div className="Header-container">
        <HeaderPage />
      </div>

      <div className="novo-pedido-container">
        <h1>Cadastro de Novo Pedido</h1>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="pedido-form">
          {/* Número do pedido e cliente */}
          <div className="form-row-novo-pedido">
            <div className="form-group-novo-pedido">
              <label htmlFor="numero-pedido-input">Número do Pedido *</label>
              <input
                id="numero-pedido-input"
                type="number"
                min="1"
                value={formData.numeroPedido}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData({
                    ...formData,
                    numeroPedido: value ? Number(value) : 0,
                  });
                }}
                required
                placeholder="Ex: 1234"
              />
            </div>

            <div className="form-group-novo-pedido">
              <label htmlFor="nome-cliente-input">Nome do Cliente *</label>
              <input
                id="nome-cliente-input"
                type="text"
                value={formData.nomeCliente}
                onChange={(e) =>
                  setFormData({ ...formData, nomeCliente: e.target.value })
                }
                required
                placeholder="Nome completo do cliente"
                minLength={3}
              />
            </div>
          </div>

          {/* Tipo de serviço */}
          <div className="form-row-servico">
            <div className="form-row-servico">
              <label htmlFor="tipo-servico-select">Tipo de Serviço *</label>
              <select
                id="tipo-servico-select"
                value={formData.servico.tipo || ""}
                onChange={(e) => {
                  const tipo = e.target.value as TipoServico;
                  setFormData((prev) => ({
                    ...prev,
                    servico: {
                      tipo,
                      subTipo: undefined,
                      servicoID:
                        tiposServico.findIndex((s) => s.value === tipo) + 1,
                    },
                    requerArte: tipo === TipoServico.ARTE,
                  }));
                }}
                required
              >
                <option value="" disabled>
                  Selecione um tipo de serviço
                </option>
                {tiposServico.map((servico) => (
                  <option key={servico.value} value={servico.value}>
                    {servico.label}
                  </option>
                ))}
              </select>
            </div>

            {(formData.servico.tipo === TipoServico.GRAFICA_RAPIDA ||
              formData.servico.tipo === TipoServico.COMUNICACAO_VISUAL) && (
              <div className="form-row-servico-subtipo">
                <label htmlFor="subtipo-servico-select">
                  Subtipo do Serviço
                </label>
                <select
                  id="subtipo-servico-select"
                  value={formData.servico.subTipo ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      servico: {
                        ...formData.servico,
                        subTipo: (e.target.value as SubTipoServico) || null,
                      },
                    })
                  }
                >
                  <option value="">Selecione um subtipo</option>
                  {tiposServico
                    .find((s) => s.value === formData.servico.tipo)
                    ?.subTipos?.map((subTipoOption) => (
                      <option
                        key={subTipoOption.value}
                        value={subTipoOption.value}
                      >
                        {subTipoOption.label}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Responsável */}
          <div className="form-row-novo-pedido">
            <div className="form-group-novo-pedido">
              <label htmlFor="responsavel-select">
                Responsável pelo Pedido *
              </label>
              <select
                id="responsavel-select"
                value={selectedResponsavel}
                onChange={(e) => setSelectedResponsavel(e.target.value)}
                required
              >
                <option value="">Selecione um responsável</option>
                {users.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo de entrega, data e horário */}
          <div className="form-row-novo-pedido-tipo-data-horario">
            <div className="form-group-novo-pedido">
              <label htmlFor="tipo-entrega-select">Tipo de Entrega *</label>
              <select
                id="tipo-entrega-select"
                value={formData.tipoDeEntrega}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tipoDeEntrega: e.target.value as Pedido["tipoDeEntrega"],
                  })
                }
                required
              >
                <option value="Retirada">Retirada</option>
                <option value="Entrega">Entrega</option>
                <option value="Instalação">Instalação</option>
              </select>
            </div>

            <div className="form-group-novo-pedido">
              <label htmlFor="prazo-entrega-input">Data de Entrega *</label>
              <input
                id="prazo-entrega-input"
                type="date"
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  const dateString = e.target.value;
                  if (dateString) {
                    const [year, month, day] = dateString
                      .split("-")
                      .map(Number);
                    const localDate = new Date(year, month - 1, day);
                    setFormData({
                      ...formData,
                      prazos: {
                        ...formData.prazos,
                        entrega: Timestamp.fromDate(localDate),
                      },
                    });
                  }
                }}
                required
              />
            </div>

            <div className="form-group-novo-pedido">
              <label htmlFor="horario-retirada-select">
                Horário de entrega *
              </label>
              <select
                id="horario-retirada-select"
                value={formData.horarioRetirada}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    horarioRetirada: e.target.value,
                  })
                }
                required
              >
                {generateTimeOptions().map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checkboxes de setores extras */}
          <div className="form-row-checkbox">
            <div id="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={retrabalho}
                  onChange={(e) => setRetrabalho(e.target.checked)}
                />
                Pedido de Retrabalho
              </label>
            </div>
            {formData.servico.tipo !== TipoServico.ARTE && (
              <div id="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.requerArte}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        requerArte: e.target.checked,
                        prazos: {
                          ...prev.prazos,
                          arte: e.target.checked ? prev.prazos.arte : null,
                        },
                      }));
                    }}
                  />
                  Requer Criação de Arte
                </label>
                <p className="checkbox-help">Setor de Arte será responsável</p>

                {formData.requerArte && (
                  <div className="form-group-arte-date">
                    <label htmlFor="prazo-arte-input">
                      Prazo de Entrega da Arte *
                    </label>
                    <input
                      id="prazo-arte-input"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => {
                        const dateString = e.target.value;
                        if (dateString) {
                          const [year, month, day] = dateString
                            .split("-")
                            .map(Number);
                          const localDate = new Date(year, month - 1, day);
                          setFormData({
                            ...formData,
                            prazos: {
                              ...formData.prazos,
                              arte: Timestamp.fromDate(localDate),
                            },
                          });
                        }
                      }}
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {formData.servico.tipo !== TipoServico.COMUNICACAO_VISUAL && (
              <div id="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.requerGalpao}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requerGalpao: e.target.checked,
                      })
                    }
                  />
                  Requer Produção/Galpão
                </label>
                <p className="checkbox-help">Galpão também será responsável</p>
              </div>
            )}
          </div>

          {/* Botão submit */}
          <div className="form-row-submit">
            <button type="submit" className="submit-button">
              Cadastrar Pedido
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
