import React, { useEffect, useState, type JSX } from "react";
import { getFirestore, collection, getDocs, Timestamp } from "firebase/firestore"; // Importe Timestamp
import { saveAs } from "file-saver";
import type { Pedido } from "../types/Pedidos";
import { TipoServicoLabels, SubTipoServicoLabels } from "../types/Servicos";
import { format, isAfter, isBefore, parseISO } from "date-fns"; // Importe isAfter, isBefore, parseISO
import "../styles/Relatorios.css";

export default function Relatorios(): JSX.Element {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroSubTipo, setFiltroSubTipo] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState(""); // Novo estado para data de início
  const [filtroDataFim, setFiltroDataFim] = useState("");     // Novo estado para data de fim

  useEffect(() => {
    const fetchPedidos = async () => {
      const db = getFirestore();
      const pedidosRef = collection(db, "pedidos");
      const snapshot = await getDocs(pedidosRef);
      const listaPedidos = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          // Garante que prazos e criadoEm sejam tratados como Timestamps do Firebase
          prazos: data.prazos || {}, // Garante que prazos é um objeto
          criadoEm: data.criadoEm instanceof Timestamp ? data.criadoEm : null, // Verifica se é Timestamp
          servico: data.servico || {}, // Garante que servico é um objeto
          ...data,
        };
      }) as Pedido[];
      setPedidos(listaPedidos);
    };
    fetchPedidos();
  }, []);

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const matchResponsavel = filtroResponsavel
      ? pedido.responsavel?.toLowerCase().includes(filtroResponsavel.toLowerCase())
      : true;
    const matchStatus = filtroStatus ? pedido.statusAtual === filtroStatus : true;
    const matchTipo = filtroTipo ? pedido.servico?.tipo === filtroTipo : true;
    const matchSubTipo = filtroSubTipo ? pedido.servico?.subTipo === filtroSubTipo : true;

    // Lógica de filtro por data
    let matchData = true;
    if (filtroDataInicio && pedido.criadoEm) {
      const dataInicioParsed = parseISO(filtroDataInicio);
      const dataCriacao = pedido.criadoEm.toDate();
      // isAfter retorna true se a primeira data for posterior à segunda.
      // Ajustamos a data de início para o começo do dia para incluir pedidos do dia inteiro
      matchData = matchData && (isAfter(dataCriacao, dataInicioParsed) || format(dataCriacao, 'yyyy-MM-dd') === filtroDataInicio);
    }

    if (filtroDataFim && pedido.criadoEm) {
      const dataFimParsed = parseISO(filtroDataFim);
      const dataCriacao = pedido.criadoEm.toDate();
      // isBefore retorna true se a primeira data for anterior à segunda.
      // Ajustamos a data de fim para o final do dia para incluir pedidos do dia inteiro
      matchData = matchData && (isBefore(dataCriacao, dataFimParsed) || format(dataCriacao, 'yyyy-MM-dd') === filtroDataFim);
    }
    
    return matchResponsavel && matchStatus && matchTipo && matchSubTipo && matchData;
  });

  const exportarExcel = async () => {
    const csvCabecalho = [
      "Número do Pedido",
      "Cliente",
      "Tipo de Serviço",
      "Subtipo de Serviço",
      "Responsável",
      "Status Atual",
      "Prazo de Entrega",
      "Criado Em",
    ];

    const linhas = pedidosFiltrados.map((pedido) => {
      // Usar os labels mapeados para Tipo de Serviço
      const tipoServicoLabel = pedido.servico?.tipo ? TipoServicoLabels[pedido.servico.tipo] : "";
      // Usar os labels mapeados para Subtipo de Serviço
      const subTipoServicoLabel = pedido.servico?.subTipo ? SubTipoServicoLabels[pedido.servico.subTipo] : "";

      const prazoEntregaFormatado = pedido.prazos?.entrega instanceof Timestamp
        ? format(pedido.prazos.entrega.toDate(), "dd/MM/yyyy")
        : "N/A";

      const criadoEmFormatado = pedido.criadoEm instanceof Timestamp
        ? format(pedido.criadoEm.toDate(), "dd/MM/yyyy")
        : "N/A";

      return [
        pedido.numeroPedido || "",
        pedido.nomeCliente || "",
        tipoServicoLabel,
        subTipoServicoLabel,
        pedido.responsavel || "",
        pedido.statusAtual || "",
        prazoEntregaFormatado,
        criadoEmFormatado,
      ];
    });

    const csv = [csvCabecalho, ...linhas]
      .map((linha) => linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(",")) // Escapar aspas duplas
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "relatorio_pedidos.csv");
  };

  return (
    <div className="relatorios-container">
      <h2>Relatórios de Pedidos</h2>

      <div className="filtros">
        <input
          type="text"
          placeholder="Filtrar por responsável"
          value={filtroResponsavel}
          onChange={(e) => setFiltroResponsavel(e.target.value)}
        />
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Todos os Status</option>
          <option value="Iniciado">Iniciado</option>
          <option value="Em Aprovação">Em Aprovação</option>
          <option value="Concluído">Concluído</option>
          <option value="Impressão">Impressão</option>
          <option value="Acabamento">Acabamento</option>
          <option value="Montagem">Montagem</option>
          <option value="Montagem/Acabamento">Montagem/Acabamento</option>
          <option value="Pedido Feito">Pedido Feito</option>
          <option value="Liberado">Liberado</option>
          <option value="Corte">Corte</option>
          <option value="Estrutura">Estrutura</option>
          <option value="Pintura">Pintura</option>
          <option value="Elétrica">Elétrica</option>
          <option value="Corte e Preparação">Corte e Preparação</option>
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos os Tipos</option>
          {Object.entries(TipoServicoLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={filtroSubTipo} onChange={(e) => setFiltroSubTipo(e.target.value)}>
          <option value="">Todos os Subtipos</option>
          {Object.entries(SubTipoServicoLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          type="date"
          value={filtroDataInicio}
          onChange={(e) => setFiltroDataInicio(e.target.value)}
          title="Data de Início"
        />
        <input
          type="date"
          value={filtroDataFim}
          onChange={(e) => setFiltroDataFim(e.target.value)}
          title="Data de Fim"
        />
      </div>

      <button className="botao-voltar" onClick={() => window.history.back()}>Voltar</button>
      <button className="botao-exportar" onClick={exportarExcel}>Exportar para Excel</button>

      <table className="tabela-relatorio">
        <thead>
          <tr>
            <th>Número</th>
            <th>Cliente</th>
            <th>Tipo</th>
            <th>Subtipo</th>
            <th>Responsável</th>
            <th>Status</th>
            <th>Entrega</th>
            <th>Criado Em</th>
          </tr>
        </thead>
        <tbody>
          {pedidosFiltrados.map((pedido) => (
            <tr key={pedido.id}>
              <td data-label="Número">{pedido.numeroPedido || "N/A"}</td>
              <td data-label="Cliente">{pedido.nomeCliente || "N/A"}</td>
              <td data-label="Tipo">
                {pedido.servico?.tipo ? TipoServicoLabels[pedido.servico.tipo] : "N/A"}
              </td>
              <td data-label="Subtipo">
                {pedido.servico?.subTipo ? SubTipoServicoLabels[pedido.servico.subTipo] : "N/A"}
              </td>
              <td data-label="Responsável">{pedido.responsavel || "N/A"}</td>
              <td data-label="Status">{pedido.statusAtual || "N/A"}</td>
              <td data-label="Entrega">
                {pedido.prazos?.entrega instanceof Timestamp
                  ? format(pedido.prazos.entrega.toDate(), "dd/MM/yyyy")
                  : "N/A"}
              </td>
              <td data-label="Criado Em">
                {pedido.criadoEm instanceof Timestamp
                  ? format(pedido.criadoEm.toDate(), "dd/MM/yyyy")
                  : "N/A"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}