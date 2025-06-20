import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, addDoc, Timestamp, doc, getDoc, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// Importe os valores dos enums e as labels
import { TipoServico, SubTipoServico, TipoServicoLabels, SubTipoServicoLabels } from "../types/Servicos";
import HeaderPage from '../components/layout/headerPage';
import type { Pedido } from "../types/Pedidos";
import { setores, type SetorValue } from "../types/Setores";
import "../styles/NovoPedido.css";

interface UserOption {
  uid: string;
  displayName: string;
  setor: string;
}

const generateTimeOptions = (interval: number = 30) => {
  const options = [];
  for (let hour = 8; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      options.push({
        value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      });
    }
  }
  return options;
};

// **CORREÇÃO AQUI:** Mapear subTipos para seus valores de ENUM diretamente
const tiposServico = [
  { value: TipoServico.ARTE, label: TipoServicoLabels[TipoServico.ARTE] },
  {
    value: TipoServico.GRAFICA_RAPIDA,
    label: TipoServicoLabels[TipoServico.GRAFICA_RAPIDA],
    subTipos: [
      { value: SubTipoServico.IMPRESSAO_RAPIDA, label: SubTipoServicoLabels[SubTipoServico.IMPRESSAO_RAPIDA] },
      { value: SubTipoServico.IMPRESSAO_COM_ACABAMENTO, label: SubTipoServicoLabels[SubTipoServico.IMPRESSAO_COM_ACABAMENTO] },
      { value: SubTipoServico.CARIMBO, label: SubTipoServicoLabels[SubTipoServico.CARIMBO] },
      { value: SubTipoServico.ACABAMENTO, label: SubTipoServicoLabels[SubTipoServico.ACABAMENTO] }
    ]
  },
  { value: TipoServico.IMPRESSAO_DIGITAL, label: TipoServicoLabels[TipoServico.IMPRESSAO_DIGITAL] },
  {
    value: TipoServico.COMUNICACAO_VISUAL,
    label: TipoServicoLabels[TipoServico.COMUNICACAO_VISUAL],
    subTipos: [
      { value: SubTipoServico.PLACA_SIMPLES, label: SubTipoServicoLabels[SubTipoServico.PLACA_SIMPLES] },
      { value: SubTipoServico.PLACA_COMPLEXA, label: SubTipoServicoLabels[SubTipoServico.PLACA_COMPLEXA] }
    ]
  },
  { value: TipoServico.TERCEIRIZADO, label: TipoServicoLabels[TipoServico.TERCEIRIZADO] }
];

export default function NovoPedido() {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getFirestore();

  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userSetorLabel, setUserSetorLabel] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>("");

  const [formData, setFormData] = useState<Omit<Pedido, 'id' | 'criadoEm' | 'atualizadoEm' | 'historicoStatus'>>({
    pedidoID: Math.floor(Math.random() * 9000) + 1000,
    numeroPedido: 0,
    nomeCliente: "",
    servico: { tipo: TipoServico.ARTE, servicoID: 1 },
    responsavel: "",
    statusAtual: "Iniciado",
    prazos: { entrega: Timestamp.now() },
    tipoDeEntrega: "Entrega",
    horarioRetirada: "08:00",
    requerArte: false,
    requerGalpao: false,
    setoresResponsaveis: [],
  });

  const [error, setError] = useState("");

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
        const userDocRef = doc(db, "usuarios", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        let currentUserName: string | null = null;
        let currentUserSetor: string | null = null;

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          currentUserName = userData.displayName;
          setUserDisplayName(currentUserName);

          const setorEncontrado = setores.find(setor =>
            setor.value.trim().toUpperCase() === userData.setor.trim().toUpperCase()
          );
          currentUserSetor = setorEncontrado?.label ?? userData.setor;
          setUserSetorLabel(currentUserSetor);

          setFormData(prev => ({
            ...prev,
            responsavel: currentUserName ?? "",
          }));
          setSelectedResponsavel(currentUser.uid);

        } else {
          alert("Dados do usuário não encontrados. Redirecionando.");
          navigate("/");
          return;
        }

        const usersCollectionRef = collection(db, "usuarios");
        const usersSnapshot = await getDocs(usersCollectionRef);
        const fetchedUsers: UserOption[] = [];
        usersSnapshot.forEach(docSnap => {
          const userData = docSnap.data();
          fetchedUsers.push({
            uid: docSnap.id,
            displayName: userData.displayName,
            setor: userData.setor
          });
        });

        const sortedUsers = fetchedUsers.sort((a, b) =>
          a.displayName.localeCompare(b.displayName)
        );
        setUsers(sortedUsers);

      } catch (err) {
        console.error("Erro ao buscar dados do usuário ou lista de usuários:", err);
        alert("Erro ao carregar dados. Tente novamente.");
        navigate("/");
      } finally {
        setLoadingUser(false);
      }
    };

    fetchInitialData();
  }, [auth, db, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (loadingUser) {
      setError("Aguarde, carregando dados do usuário...");
      return;
    }
    if (userDisplayName === null || userSetorLabel === null) {
      setError("Dados do usuário não carregados completamente. Tente novamente.");
      return;
    }

    if (!validateForm()) return;

    const selectedResponsibleUser = users.find(user => user.uid === selectedResponsavel);
    if (!selectedResponsibleUser) {
      setError("Responsável selecionado inválido.");
      return;
    }

    try {
      const now = Timestamp.now();

      const setoresResponsaveis: SetorValue[] = ["PRODUCAO_LOJA"];

      if (formData.requerArte) setoresResponsaveis.push("ARTE");
      if (formData.requerGalpao) setoresResponsaveis.push("GALPAO");

      const [hours, minutes] = (formData.horarioRetirada ?? "08:00").split(':');
      const entregaDate = formData.prazos.entrega.toDate();
      entregaDate.setHours(parseInt(hours), parseInt(minutes));

      const servicoToSave: { tipo: TipoServico; servicoID: number; subTipo?: SubTipoServico | null } = {
        tipo: formData.servico.tipo,
        servicoID: formData.servico.servicoID,
      };

      // **CORREÇÃO AQUI:** Garantir que o subTipo é o valor do ENUM
      if (formData.servico.subTipo) {
        servicoToSave.subTipo = formData.servico.subTipo; // Já será o valor do ENUM pelo select
      } else {
        servicoToSave.subTipo = null; // Mantém null se não houver subtipo
      }

      await addDoc(collection(db, "pedidos"), {
        ...formData,
        responsavel: selectedResponsibleUser.displayName,
        setoresResponsaveis,
        prazos: {
          entrega: Timestamp.fromDate(entregaDate)
        },
        servico: servicoToSave,
        historicoStatus: [{
          status: formData.statusAtual,
          data: now,
          responsavel: userDisplayName,
          setor: userSetorLabel
        }],
        criadoEm: now,
        atualizadoEm: now
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao cadastrar pedido:", error);
      setError("Erro ao cadastrar pedido. Tente novamente.");
    }
  };

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

    if (!selectedResponsavel) {
      setError("Por favor, selecione um responsável para o pedido.");
      return false;
    }

    const tipoServicoSelecionado = tiposServico.find(s => s.value === formData.servico.tipo);
    // Valida se o subtipo é obrigatório e se foi selecionado
    if (tipoServicoSelecionado?.subTipos && !formData.servico.subTipo) {
      setError("Por favor, selecione um subtipo para o serviço escolhido.");
      return false;
    }

    return true;
  };

  if (loadingUser) {
    return <div>Carregando dados do usuário...</div>;
  }

  return (
    <div>
      <div className="Header-container">
        <HeaderPage />
      </div>
      <div className="novo-pedido-container">
        <h1>Cadastro de Novo Pedido</h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="pedido-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="numero-pedido-input">Número do Pedido *</label>
              <input
                id="numero-pedido-input"
                type="number"
                min="1"
                value={formData.numeroPedido}
                onChange={(e) => setFormData({
                  ...formData,
                  numeroPedido: Math.max(0, Number(e.target.value))
                })}
                required
                placeholder="Ex: 1234"
              />
            </div>

            <div className="form-group">
              <label htmlFor="nome-cliente-input">Nome do Cliente *</label>
              <input
                id="nome-cliente-input"
                type="text"
                value={formData.nomeCliente}
                onChange={(e) => setFormData({
                  ...formData,
                  nomeCliente: e.target.value
                })}
                required
                placeholder="Nome completo do cliente"
                minLength={3}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tipo-servico-select">Tipo de Serviço *</label>
              <select
                id="tipo-servico-select"
                value={formData.servico.tipo}
                onChange={(e) => {
                  const tipo = e.target.value as TipoServico;

                  setFormData({
                    ...formData,
                    servico: {
                      tipo,
                      subTipo: undefined, // Reset subTipo when type changes
                      servicoID: tiposServico.findIndex(s => s.value === tipo) + 1
                    }
                  });
                }}
                required
              >
                {tiposServico.map((servico) => (
                  <option key={servico.value} value={servico.value}>
                    {servico.label}
                  </option>
                ))}
              </select>
            </div>

            {(formData.servico.tipo === TipoServico.GRAFICA_RAPIDA ||
              formData.servico.tipo === TipoServico.COMUNICACAO_VISUAL) && (
                <div className="form-group">
                  <label htmlFor="subtipo-servico-select">Subtipo do Serviço</label>
                  <select
                    id="subtipo-servico-select"
                    value={formData.servico.subTipo ?? ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      servico: {
                        ...formData.servico,
                        // **CORREÇÃO AQUI:** Certifique-se de que o valor é o ENUM
                        subTipo: (e.target.value as SubTipoServico) || null
                      }
                    })}
                  >
                    <option value="">Selecione um subtipo</option>
                    {tiposServico
                      .find(s => s.value === formData.servico.tipo)
                      ?.subTipos?.map((subTipoOption) => ( // Renomeado para evitar conflito
                        <option key={subTipoOption.value} value={subTipoOption.value}>
                          {subTipoOption.label}
                        </option>
                      ))}
                  </select>
                </div>
              )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="responsavel-select">Responsável pelo Pedido *</label>
              <select
                id="responsavel-select"
                value={selectedResponsavel}
                onChange={(e) => {
                  setSelectedResponsavel(e.target.value);
                }}
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

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tipo-entrega-select">Tipo de Entrega *</label>
              <select
                id="tipo-entrega-select"
                value={formData.tipoDeEntrega}
                onChange={(e) => setFormData({
                  ...formData,
                  tipoDeEntrega: e.target.value as Pedido['tipoDeEntrega']
                })}
                required
              >
                <option value="Entrega">Entrega</option>
                <option value="Retirada">Retirada</option>
                <option value="Instalação">Instalação</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="prazo-entrega-input">Data de Entrega *</label>
              <input
                id="prazo-entrega-input"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const dateString = e.target.value;
                  if (dateString) {
                    const [year, month, day] = dateString.split('-').map(Number);
                    const localDate = new Date(year, month - 1, day);
                    setFormData({
                      ...formData,
                      prazos: {
                        ...formData.prazos,
                        entrega: Timestamp.fromDate(localDate)
                      }
                    });
                  }
                }}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="horario-retirada-select">Horário de entrega *</label>
              <select
                id="horario-retirada-select"
                value={formData.horarioRetirada}
                onChange={(e) => setFormData({
                  ...formData,
                  horarioRetirada: e.target.value
                })}
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

          <div className="form-row-checkbox">
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.requerArte}
                  onChange={(e) => setFormData({
                    ...formData,
                    requerArte: e.target.checked
                  })}
                />Requer Criação de Arte
              </label>
              <p className="checkbox-help">Setor de Arte será responsável</p>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.requerGalpao}
                  onChange={(e) => setFormData({
                    ...formData,
                    requerGalpao: e.target.checked
                  })}
                /> Requer Participação do Galpão
              </label>
              <p className="checkbox-help">Setor de Galpão será responsável</p>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate("/dashboard")}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="submit-button"
            >
              Cadastrar Pedido
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}