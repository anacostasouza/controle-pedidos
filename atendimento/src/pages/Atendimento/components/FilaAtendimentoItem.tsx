/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import FinalizarOpcoes from "./FinalizarOpcoes";
import {
  deletarAtendimento,
  logDeleteAtendimento,
} from "../../../services/AtendimentoServices";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, Timestamp } from "firebase/firestore";

const auth = getAuth();

export default function FilaAtendimentoItem({
  item,
  finalizarId,
  setFinalizarId,
  handleFinalizar,
  handleAcaoFinalizar,
  handleAdicionarControlePedidos,
  handleChamarAtendimento,
  setFila,
  tempoAguardando,
  tempoAtendimento,
  formatarTempoHHMMSS,
}: any) {
  const [showJustificativa, setShowJustificativa] = useState(false);
  const [justificativa, setJustificativa] = useState("");

  const handleDelete = async () => {
    if (!justificativa.trim()) {
      alert("Por favor, informe a justificativa.");
      return;
    }

    await deletarAtendimento(item.id);
    const user = auth.currentUser;
    let responsavelNome = "";

    if (user) {
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      responsavelNome = userDoc.exists()
        ? userDoc.data().displayName || ""
        : "";
    }

    await logDeleteAtendimento({
      atendimentoId: item.id,
      nomeCliente: item.nomeCliente,
      justificativa,
      data: Timestamp.now(),
      responsavelNome,
    });
    setFila((prev: any[]) => prev.filter((i) => i.id !== item.id));
    setShowJustificativa(false);
    setJustificativa("");
  };

  return (
    <li
      className={
        "fila-atendimento-item" +
        (item.prioridade === "preferencial" ? " preferencial" : "")
      }
    >
      <div className="fila-atendimento-info">
        <div id="cliente-nome">
          <span>
            Cliente: <strong>{item.nomeCliente}</strong>
          </span>
        </div>
        <div id="cliente-tipo-atendimento">
          <span>
            Tipo de Atendimento: <strong>{item.tipoAtendimento}</strong>
          </span>
        </div>
        <div id="cliente-status">
          <span>
            Status: <strong>{item.status}</strong>
          </span>
        </div>

        {item.tempoEspera && (
          <span>
            Tempo de espera:{" "}
            <strong>{formatarTempoHHMMSS(item.tempoEspera)}</strong>
          </span>
        )}
        {item.status === "Aguardando" && (
          <span>
            Esperando: <strong>{tempoAguardando(item)}</strong>
          </span>
        )}
        {item.status === "Em Atendimento" && (
          <span>
            Tempo de atendimento: <strong>{tempoAtendimento(item)}</strong>
          </span>
        )}
        {item.tempoAtendimento && (
          <span>
            Tempo de atendimento:{" "}
            <strong>{formatarTempoHHMMSS(item.tempoAtendimento)}</strong>
          </span>
        )}
        {item.status === "Em Atendimento" && item.atendente && (
          <span>
            Atendente: <strong>{item.atendente}</strong>
          </span>
        )}
        <div id="cliente-prioridade">
          <span>
            Prioridade:{" "}
            <strong>
              {item.prioridade === "preferencial"
                ? "Preferencial"
                : "Convencional"}
            </strong>
          </span>
        </div>
      </div>
      <div className="fila-atendimento-actions">
        <button
          onClick={() => setShowJustificativa(true)}
          id="deletar-button"
          title="Deletar atendimento"
        >
          <svg
            className="deletar-icon"
            width="20"
            height="24"
            viewBox="0 0 40 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 10H6M6 10H38M6 10V38C6 39.0609 6.42143 40.0783 7.17157 40.8284C7.92172 41.5786 8.93913 42 10 42H30C31.0609 42 32.0783 41.5786 32.8284 40.8284C33.5786 40.0783 34 39.0609 34 38V10M12 10V6C12 4.93913 12.4214 3.92172 13.1716 3.17157C13.9217 2.42143 14.9391 2 16 2H24C25.0609 2 26.0783 2.42143 26.8284 3.17157C27.5786 3.92172 28 4.93913 28 6V10M16 20V32M24 20V32"
              stroke="#212530"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {showJustificativa && (
          <div className="modal-justificativa">
            <label>
              Justificativa para exclusão:
              <textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
              />
            </label>
            <div className="modal-buttons">
              <button onClick={handleDelete}>Confirmar exclusão</button>
              <button onClick={() => setShowJustificativa(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
        {item.status === "Em Atendimento" && (
          <button onClick={() => handleFinalizar(item)} id="finalizar-button">
            Finalizar
          </button>
        )}
        {item.status === "Aguardando" && (
          <button
            onClick={() => handleChamarAtendimento(item.id)}
            id="chamar-button"
          >
            Chamar para atendimento
          </button>
        )}

        {finalizarId === item.id && (
          <FinalizarOpcoes
            item={item}
            handleAcaoFinalizar={handleAcaoFinalizar}
            handleAdicionarControlePedidos={handleAdicionarControlePedidos}
            setFinalizarId={setFinalizarId}
          />
        )}
      </div>
    </li>
  );
}
