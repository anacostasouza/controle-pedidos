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
          aria-label="Deletar atendimento"
        >
          <svg
            className="deletar-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 6V16.2C18 17.8802 18 18.7202 17.673 19.362C17.3854 19.9265 16.9265 20.3854 16.362 20.673C15.7202 21 14.8802 21 13.2 21H10.8C9.11984 21 8.27976 21 7.63803 20.673C7.07354 20.3854 6.6146 19.9265 6.32698 19.362C6 18.7202 6 17.8802 6 16.2V6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6"
              stroke="currentColor"
              strokeWidth="2"
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
