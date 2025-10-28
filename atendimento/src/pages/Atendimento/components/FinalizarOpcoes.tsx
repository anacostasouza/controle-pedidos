/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from "react";
import debounce from "lodash.debounce";
import {
  atualizarHistoricoAtendimento,
  buscarClienteOmie,
} from "../../../services/AtendimentoServices";
import { getFirestore, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function FinalizarOpcoes({
  item,
  setFinalizarId,
}: any) {
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [clientesEncontrados, setClientesEncontrados] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState(item.nomeCliente || "");
  const [clienteSelecionado, setClienteSelecionado] = useState(false);
  const [showClientesList, setShowClientesList] = useState(false);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [isConsumidor, setIsConsumidor] = useState(false);
  const [acaoSelecionada, setAcaoSelecionada] = useState<string | null>(null);
  const [codigoPedidoInput, setCodigoPedidoInput] = useState("");
  const [clienteTemp, setClienteTemp] = useState<any>(null);
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
    setIsConsumidor(false);
    setClienteSelecionado(false);
    setErro("");
  };

  const handleAdicionarControlePedidos = () => {
    setAcaoSelecionada("controlePedidos");
    setModalClienteOpen(true);
    setSearchTerm(item.nomeCliente || "");
    setIsConsumidor(false);
    setClienteSelecionado(false);
    setErro("");
  };

  const detectarTipoBusca = (termo: string): { razao_social: string; cnpj_cpf: string } => {
    const termoLimpo = termo.trim();
    const apenasNumeros = termoLimpo.replaceAll(/[.\-/]/g, '');
    
    const isCpfCnpj = /^\d+$/.test(apenasNumeros) && (apenasNumeros.length === 11 || apenasNumeros.length === 14);
    
    if (isCpfCnpj) {
      return { razao_social: '', cnpj_cpf: apenasNumeros };
    } else {
      return { razao_social: termoLimpo, cnpj_cpf: '' };
    }
  };

  const buscarClientesOmiePorTermo = async (term: string) => {
    if (isConsumidor) return [];
    
    setBuscandoCliente(true);
    setErro("");
    try {
      const { razao_social, cnpj_cpf } = detectarTipoBusca(term);
      const clientesFiltro = [{ razao_social, cnpj_cpf }];
      
      const resultado = await buscarClienteOmie(clientesFiltro);
      const lista = Array.isArray(resultado?.clientes) ? resultado.clientes : [];
      
      setClientesEncontrados(lista);
      setShowClientesList(lista.length > 0);
      return lista;
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      setErro("Erro ao buscar clientes. Tente novamente.");
      setClientesEncontrados([]);
      setShowClientesList(false);
      return [];
    } finally {
      setBuscandoCliente(false);
    }
  };

  const debouncedBuscarClientes = useCallback(
    debounce((term: string) => {
      if (term.trim().length >= 3) {
        buscarClientesOmiePorTermo(term);
      } else {
        setClientesEncontrados([]);
        setShowClientesList(false);
      }
    }, 800), 
    [isConsumidor]
  );

  useEffect(() => {
    return () => {
      debouncedBuscarClientes.cancel();
    };
  }, [debouncedBuscarClientes]);

  const selecionarCliente = (cliente: any) => {
    const nome = cliente.nome || '';
    setClienteTemp(cliente);
    setSearchTerm(nome);
    setClienteSelecionado(true);
    setShowClientesList(false);
    setClientesEncontrados([]);
    setErro("");
  };

  const limparSelecao = () => {
    setSearchTerm(item.nomeCliente || "");
    setClienteSelecionado(false);
    setClienteTemp(null);
    setClientesEncontrados([]);
    setShowClientesList(false);
    setErro("");
  };

  const handleConfirmarFinalizacao = async () => {
    setErro("");

    if (!isConsumidor && !clienteTemp) {
      setErro('Por favor, selecione um cliente da lista ou marque como consumidor.');
      return;
    }

    if (!codigoPedidoInput.trim()) {
      setErro('Por favor, informe o código do pedido.');
      return;
    }

    const db = getFirestore();
    const responsavel = obterResponsavel();

    try {
      if (acaoSelecionada === "controlePedidos") {
        if (!clienteTemp?.cnpj_cpf || clienteTemp.cnpj_cpf.trim() === "") {
          setErro("CPF/CNPJ do cliente é obrigatório para adicionar ao controle de pedidos.");
          return;
        }

        const updateData: any = {
          nomeCliente: searchTerm,
          codigoPedido: codigoPedidoInput,
          status: "Adicionado ao controle de pedidos",
          codigoClienteOmie: clienteTemp.codigo_cliente_omie || "",
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
          telefone: clienteTemp?.telefone || "",
          codigoClienteOmie: clienteTemp?.codigo_cliente_omie?.toString() || "",
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
          atualizadoEm: serverTimestamp(),
        };

        if (isConsumidor) {
          updateData.isConsumidor = true;
        } else {
          updateData.codigoClienteOmie = clienteTemp.codigo_cliente_omie || "";
        }

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
    setClientesEncontrados([]);
    setAcaoSelecionada(null);
    setClienteTemp(null);
    setClienteSelecionado(false);
    setIsConsumidor(false);
    setCodigoPedidoInput("");
    setSearchTerm("");
    setErro("");
    debouncedBuscarClientes.cancel();
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
                  {isConsumidor ? (
                    "Nome do Cliente *"
                  ) : (
                    "Nome do Cliente (Razão Social) / CPF/CNPJ *"
                  )}
                </label>
                <div className="cliente-input-container">
                  <input
                    id="clienteSearch"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setErro("");
                      if (!isConsumidor && !clienteSelecionado) {
                        debouncedBuscarClientes(e.target.value);
                      }
                    }}
                    placeholder={
                      isConsumidor 
                        ? "Digite o nome do cliente" 
                        : "Digite nome ou CPF/CNPJ"
                    }
                    disabled={clienteSelecionado && !isConsumidor}
                    className="cliente-input"
                  />
                  {buscandoCliente && <span className="loading-spinner">Buscando...</span>}
                  {clienteSelecionado && !isConsumidor && (
                    <button
                      type="button"
                      className="btn-limpar-selecao"
                      onClick={limparSelecao}
                      title="Limpar seleção e buscar novamente"
                    >
                      ×
                    </button>
                  )}
                </div>

                {showClientesList && clientesEncontrados.length > 0 && !clienteSelecionado && (
                  <div className="clientes-encontrados-lista">
                    {clientesEncontrados.map((cliente) => {
                      const semCpfCnpj =
                        !cliente.cnpj_cpf ||
                        cliente.cnpj_cpf === "**.**.***.****-**" ||
                        cliente.cnpj_cpf === "***.***.***.***-**";

                      return (
                        <div
                          key={cliente.codigo_cliente_omie}
                          className={`cliente-item ${semCpfCnpj ? 'cliente-sem-documento' : ''}`}
                        >
                          <div className="cliente-item-header">
                            <div className="cliente-item-info">
                              <div className="cliente-item-nome">
                                {cliente.nome}
                                {semCpfCnpj && <span className="aviso-sem-documento"> (Sem CPF/CNPJ)</span>}
                              </div>
                              {cliente.cnpj_cpf && <div className="cliente-item-cnpj">{cliente.cnpj_cpf}</div>}
                              {cliente.telefone && <div className="cliente-item-telefone">{cliente.telefone}</div>}
                            </div>
                            <button
                              type="button"
                              className="btn-selecionar-cliente"
                              onClick={() => selecionarCliente(cliente)}
                              disabled={semCpfCnpj}
                            >
                              Selecionar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {showClientesList && clientesEncontrados.length === 0 && !buscandoCliente && (
                  <div className="clientes-encontrados-lista">
                    <div className="nenhum-cliente">Nenhum cliente encontrado.</div>
                  </div>
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

              {acaoSelecionada !== "controlePedidos" && (
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={isConsumidor}
                      onChange={(e) => {
                        setIsConsumidor(e.target.checked);
                        setErro("");
                        if (e.target.checked) {
                          setClienteSelecionado(false);
                          setClienteTemp(null);
                          setClientesEncontrados([]);
                          setShowClientesList(false);
                        } else {
                          setSearchTerm(item.nomeCliente || "");
                        }
                      }}
                    />
                    Cliente Consumidor (não registrado no Omie)
                  </label>
                  {isConsumidor && (
                    <div className="consumidor-info">
                      <small>O cliente será registrado como consumidor e não será buscado no Omie.</small>
                    </div>
                  )}
                </div>
              )}

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
