/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  atualizarHistoricoAtendimento,
} from "../../../services/AtendimentoServices";
import { getFirestore, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function FinalizarOpcoes({
  item,
  setFinalizarId,
}: any) {
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(item.nomeCliente || "");
  const [acaoSelecionada, setAcaoSelecionada] = useState<string | null>(null);
  const [codigoPedidoInput, setCodigoPedidoInput] = useState("");
  const [erro, setErro] = useState("");

  const obterResponsavel = (): string => {
    const auth = getAuth();
    const user = auth.currentUser;
    return user?.displayName || user?.email || "Desconhecido";
  };

  const handleCancelar = async () => {
    const responsavel = obterResponsavel();
    await atualizarHistoricoAtendimento(item.id, "Cancelado", responsavel);
    alert("Atendimento cancelado!");
    setFinalizarId(null);
  };

  const handleFinalizar = () => {
    setAcaoSelecionada("finalizado");
    setModalClienteOpen(true);
    setSearchTerm(item.nomeCliente || "");
    setErro("");
  };

  const handleAdicionarControlePedidos = () => {
    setAcaoSelecionada("controlePedidos");
    setModalClienteOpen(true);
    setSearchTerm(item.nomeCliente || "");
    setErro("");
  };

  const handleConfirmarFinalizacao = async () => {
    setErro("");

    if (!codigoPedidoInput.trim()) {
      setErro('Por favor, informe o código do pedido.');
      return;
    }

    const db = getFirestore();
    const responsavel = obterResponsavel();

    try {
      if (acaoSelecionada === "controlePedidos") {
        const updateData: any = {
          nomeCliente: searchTerm,
          codigoPedido: codigoPedidoInput,
          status: "Adicionado ao controle de pedidos",
          atualizadoEm: serverTimestamp(),
        };

        await updateDoc(doc(db, "atendimentos", item.id), updateData);
        await atualizarHistoricoAtendimento(
          item.id, 
          "Adicionado ao controle de pedidos", 
          responsavel 
        );

        const params = new URLSearchParams({
          nomeCliente: searchTerm,
          numeroPedido: codigoPedidoInput,
          atendimentoId: item.id,
          origem: "atendimento",
        }).toString();
        window.open(`https://gestaopedidos-desenhar.web.app/novo-pedido?${params}`);
        alert("Cliente adicionado ao controle de pedidos!");

      } else if (acaoSelecionada === "finalizado") {
        const updateData: any = {
          nomeCliente: searchTerm,
          codigoPedido: codigoPedidoInput,
          status: "Finalizado",
          isConsumidor: true,
          atualizadoEm: serverTimestamp(),
        };

        await updateDoc(doc(db, "atendimentos", item.id), updateData);
        await atualizarHistoricoAtendimento(
          item.id, 
          "Finalizado", 
          responsavel // ← ENVIANDO RESPONSÁVEL
        );
        alert("Atendimento finalizado!");
      }

      fecharModal();
    } catch (error) {
      console.error("Erro ao processar atendimento:", error);
      setErro("Erro ao processar atendimento. Tente novamente.");
    }
  };

  const fecharModal = () => {
    setModalClienteOpen(false);
    setFinalizarId(null);
    setAcaoSelecionada(null);
    setCodigoPedidoInput("");
    setSearchTerm("");
    setErro("");
  };

  return (
    <>
      <div className="finalizar-opcoes">
        <p>Escolha como finalizar:</p>
        <button onClick={handleFinalizar}>Finalizar atendimento</button>
        <button onClick={handleCancelar}>Cancelar atendimento</button>
        <button onClick={handleAdicionarControlePedidos}>Adicionar ao controle de pedidos</button>
        <button onClick={() => setFinalizarId(null)}>Fechar</button>
      </div>

      {modalClienteOpen && (
        <div className="modal-registro-direto-bg">
          <div className="modal-registro-direto">
            <div className="modal-header">
              <h2>
                {acaoSelecionada === "controlePedidos" 
                  ? "Adicionar ao Controle de Pedidos" 
                  : "Finalizar Atendimento"}
              </h2>
              <button className="btn-close" onClick={fecharModal}>×</button>
            </div>

            <div className="modal-body">
              {erro && (
                <div className="erro-mensagem">
                  {erro}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="clienteSearch">
                  Nome do Cliente *
                </label>
                <div className="cliente-input-container">
                  <input
                    id="clienteSearch"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setErro("");
                    }}
                    placeholder="Digite manualmente o nome do cliente"
                    className="cliente-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="codigoPedido">Código do Pedido *</label>
                <input
                  type="text"
                  id="codigoPedido"
                  value={codigoPedidoInput}
                  onChange={(e) => {
                    setCodigoPedidoInput(e.target.value);
                    setErro("");
                  }}
                  required
                />
              </div>

              <div className="consumidor-info">
                <small>Busca Omie desativada temporariamente. O cliente será processado por preenchimento manual.</small>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={fecharModal}>
                  Cancelar
                </button>
                <button type="button" className="btn-primary" onClick={handleConfirmarFinalizacao}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
