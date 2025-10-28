/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import "../../../styles/ModalSelecionarCliente.css";

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
                const codigoPedido = codigoPedidoMap[cliente.codigo_cliente_omie] || "";
                return (
                  <li key={cliente.codigo_cliente_omie}>
                    <span className="cliente-nome">
                      {cliente.nome}
                    </span>
                    {cliente.cnpj_cpf && (
                      <span className="cliente-cnpj-cpf">
                        {" "}
                        CPF/CNPJ: {cliente.cnpj_cpf}
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
                          [cliente.codigo_cliente_omie]: e.target.value,
                        }))
                      }
                    />
                    <button
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
