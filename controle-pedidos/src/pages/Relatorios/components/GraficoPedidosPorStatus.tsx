import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Pedido } from "../../../types/Pedidos";

interface Props {
  pedidos: Pedido[];
  filtroTipo?: string;
  filtroSubTipo?: string;
}

interface ChartData {
  status: string;
  quantidade: number;
}

const GraficoPedidosPorStatus: React.FC<Props> = ({
  pedidos,
  filtroTipo,
  filtroSubTipo,
}) => {
  // Filtra pedidos de acordo com os filtros recebidos
  const data: ChartData[] = useMemo(() => {
    const grouped: Record<string, number> = {};

    pedidos.forEach((pedido) => {
      const pedidoTipo = pedido.servico?.tipo?.trim() || "";
      const pedidoSub = pedido.servico?.subTipo?.trim() || "";
      const statusAtual = pedido.statusAtual?.trim() || "Sem Status";

      if (filtroTipo && pedidoTipo !== filtroTipo.trim()) return;
      if (filtroSubTipo && pedidoSub !== filtroSubTipo.trim()) return;

      grouped[statusAtual] = (grouped[statusAtual] || 0) + 1;
    });

    return Object.entries(grouped).map(([status, quantidade]) => ({
      status,
      quantidade,
    }));
  }, [pedidos, filtroTipo, filtroSubTipo]);

  if (data.length === 0) return <p>Nenhum dado disponível para o gráfico.</p>;

  return (
    <div style={{ width: "100%", height: 350, marginTop: 30 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="quantidade" fill="#8a2a2c" name="Quantidade" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GraficoPedidosPorStatus;
