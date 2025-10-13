/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  atualizarHistoricoAtendimento,
  buscarClienteOmie,
} from "../../../services/AtendimentoServices";
import { getFirestore, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ModalSelecionarCliente } from "./ModalSelecionarCliente";

export default function FinalizarOpcoes({
  item,
  setFinalizarId,
}: any) {
  const [modalClienteOpen, setModalClienteOpen] = useState(false);
  const [clientesEncontrados, setClientesEncontrados] = useState<any[]>([]);
  const [dadosBusca, setDadosBusca] = useState({
    nome: item.nomeCliente || "",
    cnpj_cpf: "",
  });
  const [acaoSelecionada, setAcaoSelecionada] = useState<string | null>(null);
  const [erroCpf, setErroCpf] = useState<string | null>(null);

  // Cancelar atendimento
  const handleCancelar = async () => {
    await atualizarHistoricoAtendimento(item.id, "Cancelado");
    alert("Atendimento cancelado!");
    setFinalizarId(null);
  };

  // Finalizar atendimento (abre modal de busca)
  const handleFinalizar = () => {
    setAcaoSelecionada("finalizado");
    setModalClienteOpen(true);
  };

  // Adicionar ao controle de pedidos (abre modal de busca)
  const handleAdicionarControlePedidos = () => {
    setAcaoSelecionada("controlePedidos");
    setModalClienteOpen(true);
  };

  // Buscar cliente Omie
  const buscarESelecionarCliente = async (nome: string, cnpj_cpf: string) => {
    // Sempre envia nome e CPF/CNPJ para controle de pedidos
    const clientesFiltro =
      acaoSelecionada === "controlePedidos"
        ? [{ razao_social: nome, cnpj_cpf }]
        : [{ razao_social: nome, cnpj_cpf }];
    const resultado = await buscarClienteOmie(clientesFiltro);
    const lista = Array.isArray(resultado?.clientes)
      ? resultado.clientes
      : [];
    setClientesEncontrados(lista);
  };

  // Confirmar cliente e finalizar/adicionar pedido
  const handleConfirmarCliente = async (cliente: any, codigoPedido: string) => {
    const db = getFirestore();

    if (acaoSelecionada === "controlePedidos") {
      // Verifica se o cliente selecionado tem CPF/CNPJ preenchido
      if (!cliente.cnpj_cpf || cliente.cnpj_cpf.trim() === "") {
        setErroCpf("CPF/CNPJ do cliente é obrigatório para adicionar ao controle de pedidos.");
        return;
      }
      setErroCpf(null);
      await atualizarHistoricoAtendimento(item.id, "Adicionado ao controle de pedidos");
      await updateDoc(doc(db, "atendimentos", item.id), {
        telefone: cliente.telefone || "",
        codigoClienteOmie: cliente.codigo_cliente_omie || "",
        nomeCliente: cliente.nome || "",
        codigoPedido: codigoPedido,
        status: "Adicionado ao controle de pedidos",
        atualizadoEm: serverTimestamp(),
      });
      // Abre o site de controle de pedidos com todos os dados necessários
      const params = new URLSearchParams({
        nomeCliente: cliente.nome || "",
        telefone: cliente.telefone || "",
        codigoClienteOmie: cliente.codigo_cliente_omie?.toString() || "",
        numeroPedido: codigoPedido || "",
        atendimentoId: item.id,
        origem: "atendimento",
      }).toString();
      window.open(`https://gestaopedidos-desenhar.web.app/novo-pedido?${params}`);
      alert("Cliente adicionado ao controle de pedidos!");
    } else if (acaoSelecionada === "finalizado") {
      await updateDoc(doc(db, "atendimentos", item.id), {
        telefone: cliente.telefone || "",
        codigoClienteOmie: cliente.codigo_cliente_omie || "",
        nomeCliente: cliente.nome || "",
        codigoPedido: codigoPedido,
        status: "Finalizado",
        atualizadoEm: serverTimestamp(),
      });
      await atualizarHistoricoAtendimento(item.id, "Finalizado");
      alert("Atendimento finalizado!");
    } else if (acaoSelecionada === "cancelado") {
      await atualizarHistoricoAtendimento(item.id, "Cancelado");
      alert("Atendimento cancelado!");
    }

    setModalClienteOpen(false);
    setFinalizarId(null);
    setClientesEncontrados([]);
    setAcaoSelecionada(null);
  };

  return (
    <div className="finalizar-opcoes">
      <p>Escolha como finalizar:</p>
      <button onClick={handleFinalizar}>Finalizar atendimento</button>
      <button onClick={handleCancelar}>Cancelar atendimento</button>
      <button onClick={handleAdicionarControlePedidos}>Adicionar ao controle de pedidos</button>
      <button onClick={() => setFinalizarId(null)}>Fechar</button>

      <ModalSelecionarCliente
        open={modalClienteOpen}
        clientes={clientesEncontrados}
        onBuscar={buscarESelecionarCliente}
        onClose={() => {
          setModalClienteOpen(false);
          setClientesEncontrados([]);
          setAcaoSelecionada(null);
          setErroCpf(null);
        }}
        onConfirm={handleConfirmarCliente}
        dadosBusca={dadosBusca}
        setDadosBusca={setDadosBusca}
        erroCpf={erroCpf}
      />
    </div>
  );
}
