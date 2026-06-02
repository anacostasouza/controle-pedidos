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

    // Formataçao dos dados para o gráfico
import { capitalizeWords } from "../../../utils/FormatUtils";

    interface Props {
        pedidos: Pedido[];
    }

    const cores = [
        "#8884d8",
        "#82ca9d",
        "#ffc658",
        "#ff8042",
        "#8dd1e1",
        "#a4de6c",
    ];

    interface ChartData {
        name: string;
        value: number;
    }

    const GraficoPedidosPorTipo: React.FC<Props> = ({ pedidos }) => {
        // Agrupa pedidos por tipo de serviço
        const data: ChartData[] = useMemo(() => {
            const grouped: Record<string, number> = {};

            pedidos.forEach((pedido) => {
                const tipo = pedido.servico.tipo || "Desconhecido";
                grouped[tipo] = (grouped[tipo] || 0) + 1;
            });

            return Object.entries(grouped).map(([name, value]) => ({
                name: capitalizeWords(name),
                value,
            }));
        }, [pedidos]);

        if (data.length === 0) {
            return <p>Nenhum pedido disponível para exibir o gráfico.</p>;
        }

        return (
            <div style={{ width: "100%", height: 350, marginTop: 30 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={100}
                            fill="#8884d8"
                            label
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={cores[index % cores.length]}
                                />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    export default GraficoPedidosPorTipo;
