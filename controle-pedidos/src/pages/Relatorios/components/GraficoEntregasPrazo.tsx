/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Pedido } from "../../../types/Pedidos";

interface Props {
  pedidos: Pedido[];
}

// Cores: No Prazo = verde, Atrasadas = vermelho
const cores = ["#82ca9d", "#D42626"];

interface ChartData {
  name: string;
  value: number;
}

// Função unificada para verificar se o pedido está atrasado (mesma lógica do dashboard)
export function isPedidoAtrasadoDashboardStyle(pedido: Pedido): boolean {
  if (!pedido.prazos?.entrega) return false;

  const entrega = "toDate" in pedido.prazos.entrega
    ? pedido.prazos.entrega.toDate()
    : new Date(pedido.prazos.entrega as any);

  return (
    entrega.getTime() < new Date().getTime() &&
    pedido.statusAtual !== "Concluído" &&
    pedido.statusAtual !== "Entregue"
  );
}

const GraficoEntregasPrazo: React.FC<Props> = ({ pedidos }) => {
  const data: ChartData[] = useMemo(() => {
    let noPrazo = 0;
    let atrasadas = 0;

    pedidos.forEach((pedido) => {
      if (!pedido.prazos?.entrega) return;

      if (!isPedidoAtrasadoDashboardStyle(pedido)) {
        noPrazo++;
      } else {
        atrasadas++;
      }
    });

    return [
      { name: "No Prazo", value: noPrazo },
      { name: "Atrasadas", value: atrasadas },
    ];
  }, [pedidos]);

  if (data.length === 0)
    return <p>Nenhum dado disponível para exibir o gráfico.</p>;

  return (
    <div style={{ width: "100%", height: 350, marginTop: 30 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={120}
            label
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={cores[index % cores.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GraficoEntregasPrazo;
