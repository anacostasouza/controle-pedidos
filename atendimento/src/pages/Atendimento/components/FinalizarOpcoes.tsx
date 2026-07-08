/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import {
  atualizarHistoricoAtendimento,
} from "../../../services/AtendimentoServices";
import { buscarClienteTagPlus } from "../../../services/AtendimentoServices";
import { getFirestore, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

interface ClienteTagPlus {
  nome?: string;
  razao_social?: string;
  nome_fantasia?: string;
  fantasia?: string;
  cnpj_cpf?: string;
  cnpj?: string;
  cpf?: string;
  codigo_cliente_omie?: number | string;
  codigo_cliente?: number | string;
  codigo?: number | string;
  id?: number | string;
  telefone?: string;
}

const formatarCpfCnpj = (valor?: string): string => {
  const numeros = String(valor ?? "").replace(/\D/g, "");
  const ultimosQuatro = numeros.slice(-4);

  if (!ultimosQuatro) {
    return "";
  }

  if (numeros.length === 11) {
    return `***.***.***-${ultimosQuatro}`;
  }

  if (numeros.length === 14) {
    return `**.***.***/****-${ultimosQuatro}`;
  }

  return ultimosQuatro;
};

const TEMPO_DEBOUNCE_BUSCA_CLIENTE = 1400;

export default function FinalizarOpcoes({
  item,
  setFinalizarId,
}: any) {
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const clienteSelecionadoRef = useRef("");
  const clienteSelecionadoDetalheRef = useRef<ClienteTagPlus | null>(null);
  const [searchTerm, setSearchTerm] = useState(item.nomeCliente || "");
  const [acaoSelecionada, setAcaoSelecionada] = useState<string | null>(null);
  const [codigoPedidoInput, setCodigoPedidoInput] = useState("");
  const [isConsumidor, setIsConsumidor] = useState(Boolean(item.isConsumidor));
  const [clientesEncontrados, setClientesEncontrados] = useState<ClienteTagPlus[]>([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [buscaExecutada, setBuscaExecutada] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteTagPlus | null>(null);
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
    clienteSelecionadoRef.current = "";
    clienteSelecionadoDetalheRef.current = null;
    setIsConsumidor(Boolean(item.isConsumidor));
    setBuscaExecutada(false);
    setErro("");
  };

  const handleAdicionarControlePedidos = () => {
    setAcaoSelecionada("controlePedidos");
    setModalClienteOpen(true);
    setSearchTerm(item.nomeCliente || "");
    clienteSelecionadoRef.current = "";
    clienteSelecionadoDetalheRef.current = null;
    setIsConsumidor(Boolean(item.isConsumidor));
    setBuscaExecutada(false);
    setClienteSelecionado(null);
    setClientesEncontrados([]);
    setErro("");
  };

  useEffect(() => {
    if (!modalClienteOpen || isConsumidor) {
      setClientesEncontrados([]);
      setBuscandoCliente(false);
      setBuscaExecutada(false);
      return;
    }

    const termo = searchTerm.trim();
    if (termo.length < 3) {
      setClientesEncontrados([]);
      setClienteSelecionado(null);
      setBuscandoCliente(false);
      setBuscaExecutada(false);
      return;
    }

    if (clienteSelecionadoRef.current === termo) {
      setBuscandoCliente(false);
      return;
    }

    setBuscandoCliente(true);
    setBuscaExecutada(false);

    const timeoutId = globalThis.setTimeout(async () => {
      try {
        const resultadoBusca = await buscarClienteTagPlus(termo);
        const listaClientes = Array.isArray(resultadoBusca?.clientes)
          ? resultadoBusca.clientes
          : [];

        setClientesEncontrados(
          listaClientes.filter((cliente: ClienteTagPlus) => {
            const documento = String(cliente.cnpj_cpf || cliente.cnpj || cliente.cpf || "").replace(/\D/g, "");
            return Boolean(documento);
          })
        );
        setBuscaExecutada(true);
      } catch (error) {
        console.error("Erro ao buscar cliente na TagPlus:", error);
        setClientesEncontrados([]);
        setBuscaExecutada(true);
      } finally {
        setBuscandoCliente(false);
      }
    }, TEMPO_DEBOUNCE_BUSCA_CLIENTE);

    return () => globalThis.clearTimeout(timeoutId);
  }, [modalClienteOpen, searchTerm, isConsumidor]);

  const handleConfirmarFinalizacao = async () => {
    setErro("");

    if (!codigoPedidoInput.trim()) {
      setErro('Por favor, informe o código do pedido.');
      return;
    }

    const db = getFirestore();
    const responsavel = obterResponsavel();

    try {
      const clienteEncontrado = clienteSelecionadoDetalheRef.current ?? clienteSelecionado;
      const nomeFinal = (clienteEncontrado?.nome || searchTerm || item.nomeCliente || "Cliente Consumidor").trim();

      if (!isConsumidor) {
        if (!clienteEncontrado) {
          setErro("Selecione um cliente da lista da TagPlus ou marque Cliente consumidor.");
          return;
        }

        if (!String(clienteEncontrado.cnpj_cpf || clienteEncontrado.cnpj || clienteEncontrado.cpf || "").replace(/\D/g, "")) {
          setErro("Cliente sem CPF/CNPJ válido.");
          return;
        }
      }

      if (acaoSelecionada === "controlePedidos") {
        const updateData: any = {
              nomeCliente: isConsumidor ? nomeFinal : (clienteEncontrado?.nome || nomeFinal),
          codigoPedido: codigoPedidoInput,
          status: "Adicionado ao controle de pedidos",
            isConsumidor,
          atualizadoEm: serverTimestamp(),
        };

        await updateDoc(doc(db, "atendimentos", item.id), updateData);
        await atualizarHistoricoAtendimento(
          item.id, 
          "Adicionado ao controle de pedidos", 
          responsavel 
        );

        const params = new URLSearchParams({
          nomeCliente: isConsumidor ? nomeFinal : (clienteEncontrado?.nome || nomeFinal),
          codigoClienteTagPlus: isConsumidor ? "" : String(clienteEncontrado?.codigo_cliente_omie || clienteEncontrado?.codigo_cliente || clienteEncontrado?.codigo || clienteEncontrado?.id || ""),
          numeroPedido: codigoPedidoInput,
          atendimentoId: item.id,
          origem: "atendimento",
        }).toString();
        window.open(`https://gestaopedidos-desenhar.web.app/novo-pedido?${params}`);
        alert("Cliente adicionado ao controle de pedidos!");

      } else if (acaoSelecionada === "finalizado") {
        const updateData: any = {
          nomeCliente: isConsumidor ? nomeFinal : (clienteEncontrado?.nome || nomeFinal),
          codigoPedido: codigoPedidoInput,
          status: "Finalizado",
          isConsumidor,
          atualizadoEm: serverTimestamp(),
        };

        await updateDoc(doc(db, "atendimentos", item.id), updateData);
        await atualizarHistoricoAtendimento(
          item.id, 
          "Finalizado", 
          responsavel 
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
                      clienteSelecionadoRef.current = "";
                      clienteSelecionadoDetalheRef.current = null;
                      setSearchTerm(e.target.value);
                      setClienteSelecionado(null);
                      setErro("");
                    }}
                    placeholder="Digite manualmente o nome do cliente"
                    className="cliente-input"
                  />
                  {!isConsumidor && buscandoCliente && searchTerm.trim().length >= 3 && (
                    <div className="cliente-busca-status">Buscando clientes na TagPlus...</div>
                  )}
                  {!isConsumidor && clientesEncontrados.length > 0 && (
                    <div className="clientes-encontrados-lista">
                      {clientesEncontrados.map((cliente) => {
                        const nomeClienteEncontrado = cliente.nome || cliente.razao_social || cliente.nome_fantasia || cliente.fantasia || "Cliente sem nome";
                        const cpfCnpj = String(cliente.cnpj_cpf || cliente.cnpj || cliente.cpf || "").replace(/\D/g, "");

                        return (
                          <button
                            key={String(cliente.codigo_cliente_omie ?? cliente.codigo_cliente ?? cliente.codigo ?? cliente.id ?? nomeClienteEncontrado)}
                            type="button"
                            className="cliente-encontrado-item"
                            onClick={() => {
                              clienteSelecionadoRef.current = nomeClienteEncontrado;
                              clienteSelecionadoDetalheRef.current = cliente;
                              setClienteSelecionado(cliente);
                              setSearchTerm(nomeClienteEncontrado);
                              setErro("");
                              setClientesEncontrados([]);
                            }}
                          >
                            <strong>{nomeClienteEncontrado}</strong>
                            {cpfCnpj && <span>CPF/CNPJ: {formatarCpfCnpj(cpfCnpj)}</span>}
                            {cliente.telefone && <span>Telefone: {cliente.telefone}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {!isConsumidor && buscaExecutada && !buscandoCliente && searchTerm.trim().length >= 3 && clientesEncontrados.length === 0 && clienteSelecionadoRef.current !== searchTerm.trim() && (
                  <div className="cliente-sem-resultados">Nenhum cliente encontrado na TagPlus.</div>
                )}
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

              <div className="consumidor-option">
                <label>
                  <input
                    type="checkbox"
                    checked={isConsumidor}
                    onChange={(e) => {
                      setIsConsumidor(e.target.checked);
                      if (e.target.checked) {
                        setClienteSelecionado(null);
                        setClientesEncontrados([]);
                      }
                      setErro("");
                    }}
                  />
                  Cliente consumidor
                </label>
              </div>

              <div className="consumidor-info">
                <small>
                  Quando marcado, a confirmação segue sem validação na TagPlus.
                </small>
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
