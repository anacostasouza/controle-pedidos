import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { saveAs } from "file-saver";

import Header from "../components/layout/headerPage";
import { formatDate } from "../utils/dashboardUtils";
import {
  gerarCsvPedidos,
  getTipoServicoLabel,
  getSubTipoServicoLabel,
} from "../utils/utilsRelatorios";
import { TipoServicoLabels, SubTipoServicoLabels } from "../types/Servicos";
import type { Pedido } from "../types/Pedidos";

import "../styles/Relatorios.css";

export default function RelatoriosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

 
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroSubTipo, setFiltroSubTipo] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroCliente, setFiltroCliente] = useState<string>("");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

  useEffect(() => {
    const fetchPedidos = async () => {
      const db = getFirestore();
      const q = query(collection(db, "pedidos"), orderBy("prazos.entrega"));
      const snapshot = await getDocs(q);
      const pedidosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Pedido[];

      setPedidos(pedidosData);
      setLoading(false);
    };

    fetchPedidos();
  }, [navigate]);

  const exportarCSV = () => {
    const csvContent = gerarCsvPedidos(pedidosFiltrados);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "relatorio-pedidos.csv");
  };

  const filtrarPorData = (pedido: Pedido): boolean => {
    if (!pedido.prazos?.entrega) return false;
    const prazoTime = pedido.prazos.entrega.toDate
      ? pedido.prazos.entrega.toDate().getTime()
      : new Date(pedido.prazos.entrega).getTime();

    if (dataInicio) {
      const inicioTime = new Date(dataInicio).getTime();
      if (prazoTime < inicioTime) return false;
    }

    if (dataFim) {
      const fimTime = new Date(dataFim);
      fimTime.setHours(23, 59, 59, 999);
      if (prazoTime > fimTime.getTime()) return false;
    }

    return true;
  };

  const pedidosFiltrados = pedidos.filter((pedido) => {
    if (filtroTipo && pedido.servico?.tipo !== filtroTipo) return false;
    if (filtroSubTipo && pedido.servico?.subTipo !== filtroSubTipo) return false;
    if (
      filtroStatus &&
      !pedido.statusAtual.toLowerCase().includes(filtroStatus.toLowerCase())
    )
      return false;
    if (
      filtroCliente &&
      !pedido.nomeCliente.toLowerCase().includes(filtroCliente.toLowerCase())
    )
      return false;
    if (!filtrarPorData(pedido)) return false;

    return true;
  });

  const tiposOpcoes = Object.entries(TipoServicoLabels).map(([key, label]) => (
    <option key={key} value={key}>
      {label}
    </option>
  ));

  const subTiposOpcoes = Object.entries(SubTipoServicoLabels).map(([key, label]) => (
    <option key={key} value={key}>
      {label}
    </option>
  ));

  return (
    <div className="relatorios-page">
      <div className="relatorios-header">
        <Header />
      </div>

      <div className="relatorios-actions">
        <button className="relatorio-exportar-button" onClick={exportarCSV}>
          Exportar Relátorio
        </button>
      </div>

      <div className="relatorios-filtros">
        <label>
          Tipo Serviço:
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos</option>
            {tiposOpcoes}
          </select>
        </label>

        <label>
          Subtipo Serviço:
          <select value={filtroSubTipo} onChange={(e) => setFiltroSubTipo(e.target.value)}>
            <option value="">Todos</option>
            {subTiposOpcoes}
          </select>
        </label>

        <label>
          Status:
          <input
            type="text"
            placeholder="Filtrar por status"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          />
        </label>

        <label>
          Cliente:
          <input
            type="text"
            placeholder="Filtrar por cliente"
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
          />
        </label>

        <label>
          Prazo Entrega (Início):
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </label>

        <label>
          Prazo Entrega (Fim):
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </label>
      </div>

      {loading ? (
        <p>Carregando pedidos...</p>
      ) : (
        <table className="relatorios-table">
          <thead>
            <tr>
              <th>Nº Pedido</th>
              <th>Cliente</th>
              <th>Serviço</th>
              <th>Subtipo</th>
              <th>Status</th>
              <th>Prazo de Entrega</th>
              <th>Data de Criação</th>
            </tr>
          </thead>
          <tbody>
            {pedidosFiltrados.map((pedido) => (
              <tr key={pedido.id}>
                <td>{pedido.numeroPedido}</td>
                <td>{pedido.nomeCliente}</td>
                <td>{getTipoServicoLabel(pedido.servico?.tipo)}</td>
                <td>{getSubTipoServicoLabel(pedido.servico?.subTipo)}</td>
                <td>{pedido.statusAtual}</td>
                <td>{formatDate(pedido.prazos?.entrega)}</td>
                <td>{formatDate(pedido.criadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
