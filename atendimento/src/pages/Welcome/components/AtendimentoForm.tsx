import React, { useEffect, useState } from "react";
import {
  buscarServicosAtendimento,
  type ServicoAtendimento,
} from "../../../services/AtendimentoServices";
import { criarAtendimentoFila } from "../../../services/AtendimentoServices";

export const AtendimentoForm: React.FC = () => {
  const [servicos, setServicos] = useState<ServicoAtendimento[]>([]);
  const [nomeCliente, setNomeCliente] = useState("");
  const [tipoAtendimento, setTipoAtendimento] = useState("");
  const [prioridade, setPrioridade] = useState<"convencional" | "preferencial">(
    "convencional"
  );
  const [mensagem, setMensagem] = useState("");
  useEffect(() => {
    buscarServicosAtendimento().then(setServicos);
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente || !tipoAtendimento) {
      alert("Por favor, preencha todos os campos.");
      return;
    }
    try {
      await criarAtendimentoFila({ nomeCliente, tipoAtendimento, prioridade });
      setMensagem(
        "Atendimento criado com sucesso! Por favor aguarde, seu nome será chamado!"
      );
      setNomeCliente("");
      setTipoAtendimento("");
      setPrioridade("convencional");
    } catch (error) {
      if (error instanceof Error) {
        setMensagem("Erro ao criar atendimento: " + error.message);
      } else {
        setMensagem("Erro ao criar atendimento.");
      }
    }
  };

  useEffect(() => {
    if (mensagem) {
      const timer = setTimeout(() => setMensagem(""), 5000); 
      return () => clearTimeout(timer);
    }
  }, [mensagem]);

  return (
    <div>
      <form id="form-welcome" onSubmit={handleSubmit}>
        <input
          id="input-nome"
          type="text"
          placeholder="Nome completo"
          value={nomeCliente}
          onChange={(e) => setNomeCliente(e.target.value)}
          required
        />

        <div id="servicos-radio-group">
          <p>Selecione o serviço desejado:</p>
          {servicos.map((servico) => (
            <label
              key={servico.tipo}
              style={{ display: "block", marginBottom: 4 }}
            >
              <input
                type="radio"
                name="tipoAtendimento"
                value={servico.tipo}
                checked={tipoAtendimento === servico.tipo}
                onChange={(e) => setTipoAtendimento(e.target.value)}
                required
              />
              {servico.tipo}
            </label>
          ))}
        </div>

        <div id="prioridade-group">
          <p>Entrar na fila:</p>
          <div id="button-prioridade">
            <button
              type="submit"
              className={
                prioridade === "convencional"
                  ? "botao-prioridade selecionado"
                  : "botao-prioridade"
              }
              onClick={() => setPrioridade("convencional")}
            >
              Convencional
            </button>
            <button
              type="submit"
              className={
                prioridade === "preferencial"
                  ? "botao-prioridade selecionado"
                  : "botao-prioridade"
              }
              onClick={() => setPrioridade("preferencial")}
            >
              Preferencial
            </button>
          </div>
        </div>
        {mensagem && <p className="mensagem">{mensagem}</p>}
      </form>
    </div>
  );
};
