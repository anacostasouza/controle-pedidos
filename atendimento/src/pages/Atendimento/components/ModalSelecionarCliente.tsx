/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import "../../../styles/ModalSelecionarCliente.css";

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

export function ModalSelecionarCliente({
  open,
  onClose,
  clientes,
  onBuscar,
  onConfirm,
  dadosBusca,
  setDadosBusca,
  erroCpf, 
}: any) {
  const [nome, setNome] = useState(dadosBusca?.nome || "");
  const [cnpj_cpf, setCnpjCpf] = useState(dadosBusca?.cnpj_cpf || "");
  const [codigoPedidoMap, setCodigoPedidoMap] = useState<Record<string, string>>({});
  const [buscou, setBuscou] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientesEncontrados, setClientesEncontrados] = useState<any[]>([]);

  const getClienteKey = (cliente: any) =>
    String(cliente.codigo_cliente ?? cliente.codigo ?? cliente.id ?? "");

  const getClienteNome = (cliente: any) =>
    cliente.nome || cliente.razao_social || cliente.nome_fantasia || cliente.fantasia || "";

  const getClienteCpfCnpj = (cliente: any) =>
    String(cliente.cnpj_cpf || cliente.cnpj || cliente.cpf || "").trim();

  useEffect(() => {
    setNome(dadosBusca?.nome || "");
    setCnpjCpf(dadosBusca?.cnpj_cpf || "");
  }, [dadosBusca]);

  useEffect(() => {
    const lista = Array.isArray(clientes) ? clientes : [];
    setClientesEncontrados(lista);
    setLoading(false); 
  }, [clientes]);

  if (!open) return null;

  return (
    <div className="modal-bg">
      <div className="modal">
        <h2>Buscar Cliente</h2>
        <div>
          <input
            placeholder="Nome do cliente (Razão Social)"
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setDadosBusca((prev: any) => ({ ...prev, nome: e.target.value }));
            }}
          />
          <input
            placeholder="CPF/CNPJ"
            value={cnpj_cpf}
            onChange={(e) => {
              setCnpjCpf(e.target.value);
              setDadosBusca((prev: any) => ({
                ...prev,
                cnpj_cpf: e.target.value,
              }));
            }}
          />
          <button
            className="button-buscar"
            onClick={() => {
              setLoading(true);
              setBuscou(true);
              onBuscar(nome.trim(), cnpj_cpf.trim());
            }}
          >
            Buscar
          </button>
        </div>
        <div>
          {erroCpf && (
            <div style={{ color: "red", marginBottom: 8 }}>
              {erroCpf}
            </div>
          )}
          {loading && buscou && (
            <p style={{ color: "#888" }}>Buscando...</p>
          )}
          {!loading && buscou && clientesEncontrados.length === 0 && (
            <p>Nenhum cliente encontrado.</p>
          )}
          {!loading && clientesEncontrados.length > 0 && (
            <ul>
              {clientesEncontrados.map((cliente: any) => {
                const clienteKey = getClienteKey(cliente);
                const codigoPedido = codigoPedidoMap[clienteKey] || "";
                const cpfCnpjOriginal = getClienteCpfCnpj(cliente);
                const cpfCnpj = formatarCpfCnpj(cpfCnpjOriginal);
                const temCpfCnpj = Boolean(cpfCnpjOriginal);
                return (
                  <li key={clienteKey}>
                    <span className="cliente-nome">
                      {getClienteNome(cliente)}
                    </span>
                    {cpfCnpj && (
                      <span className="cliente-cnpj-cpf">
                        {" "}
                        CPF/CNPJ: {cpfCnpj}
                      </span>
                    )}
                    {cliente.telefone && (
                      <span className="cliente-telefone">
                        {" "} 
                        Telefone: {cliente.telefone}
                      </span>
                    )}
                    <input
                      className="input-codigo-pedido"
                      type="text"
                      required
                      placeholder="Código do pedido*"
                      value={codigoPedido}
                      onChange={(e) =>
                        setCodigoPedidoMap((prev) => ({
                          ...prev,
                          [clienteKey]: e.target.value,
                        }))
                      }
                    />
                    {!temCpfCnpj && (
                      <div style={{ color: "#b45309", marginTop: 4 }}>
                        Cliente sem CPF/CNPJ não pode ser selecionado para pedido.
                      </div>
                    )}
                    <button
                      disabled={!temCpfCnpj || !codigoPedido.trim()}
                      onClick={() => onConfirm(cliente, codigoPedido)}
                    >
                      Selecionar e Finalizar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <button onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
