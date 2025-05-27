import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { TipoServico } from "../types/Servicos";
import HeaderPage from '../components/layout/headerPage';
import type { Pedido } from "../types/Pedidos";
import "../styles/NovoPedido.css";

// Função utilitária para gerar opções de horário
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

// Constantes de configuração
const tiposServico = [
  { value: TipoServico.ARTE, label: "Arte" },
  { 
    value: TipoServico.GRAFICA_RAPIDA, 
    label: "Gráfica Rápida", 
    subTipos: ["Impressão Rápida", "Impressão com Acabamento", "Carimbo", "Acabamento"]
  },
  { value: TipoServico.IMPRESSAO_DIGITAL, label: "Impressão Digital" },
  { 
    value: TipoServico.COMUNICACAO_VISUAL, 
    label: "Comunicação Visual", 
    subTipos: ["Placa Simples", "Placa Complexa"]
  },
  { value: TipoServico.TERCEIRIZADO, label: "Terceirizado" }
];

export default function NovoPedido() {
  const navigate = useNavigate();
  const auth = getAuth();
  
  const [formData, setFormData] = useState<Omit<Pedido, 'id' | 'criadoEm' | 'atualizadoEm' | 'historicoStatus'>>({
    pedidoID: Math.floor(Math.random() * 9000) + 1000,
    numeroPedido: 0,
    nomeCliente: "",
    servico: { tipo: TipoServico.ARTE, servicoID: 1 },
    responsavel: auth.currentUser?.displayName ?? "",
    statusAtual: "Iniciado",
    prazos: { entrega: Timestamp.now() },
    tipoDeEntrega: "Entrega",
    horarioRetirada: "08:00",
    requerArte: false,
    requerGalpao: false,
    setoresResponsaveis: [],
  });

  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) return;
    
    try {
      const db = getFirestore();
      const now = Timestamp.now();
      
      // Determina setores responsáveis
      const setoresResponsaveis = ["producao_loja"];
      if (formData.requerArte) setoresResponsaveis.push("arte");
      if (formData.requerGalpao) setoresResponsaveis.push("producao_galpao");

      // Combina data e horário
      const [hours, minutes] = (formData.horarioRetirada ?? "08:00").split(':');
      const entregaDate = formData.prazos.entrega.toDate();
      entregaDate.setHours(parseInt(hours), parseInt(minutes));
      
      await addDoc(collection(db, "pedidos"), {
        ...formData,
        setoresResponsaveis,
        prazos: {
          entrega: Timestamp.fromDate(entregaDate)
        },
        historicoStatus: [{
          status: formData.statusAtual,
          data: now,
          responsavel: formData.responsavel,
          setor: localStorage.getItem("userSetor") ?? ""
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
    
    return true;
  };

  return (
    <div className="novo-pedido-container">
      <HeaderPage />
      
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
                    subTipo: undefined,
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

          {formData.servico.tipo === TipoServico.GRAFICA_RAPIDA || 
           formData.servico.tipo === TipoServico.COMUNICACAO_VISUAL ? (
            <div className="form-group">
              <label htmlFor="subtipo-servico-select">Subtipo do Serviço</label>
              <select
                id="subtipo-servico-select"
                value={formData.servico.subTipo ?? ""}
                onChange={(e) => setFormData({
                  ...formData,
                  servico: {
                    ...formData.servico,
                    subTipo: (e.target.value as import("../types/Servicos").SubTipoServico) || undefined
                  }
                })}
              >
                <option value="">Selecione um subtipo</option>
                {tiposServico
                  .find(s => s.value === formData.servico.tipo)
                  ?.subTipos?.map((subTipo) => (
                    <option key={subTipo} value={subTipo}>
                      {subTipo}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}
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
              onChange={(e) => setFormData({
                ...formData,
                prazos: {
                  ...formData.prazos,
                  entrega: Timestamp.fromDate(new Date(e.target.value))
                }
              })}
              required 
            />
          </div>

          {formData.tipoDeEntrega === "Retirada" && (
            <div className="form-group">
              <label htmlFor="horario-retirada-select">Horário de Retirada *</label>
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
          )}
        </div>

        <div className="form-row">
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
  );
}