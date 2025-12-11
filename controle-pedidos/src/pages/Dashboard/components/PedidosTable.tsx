/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Pedido, StatusPedido } from "../../../types/Pedidos"
import { getTodasEtapasDoPedido } from "../../../utils/FirestoreUtils";
import { PedidoRow } from "../components/PedidoRow"

interface PedidosTableProps {
  pedidosFiltrados: Pedido[];
  etapasPorPedido: Record<string, Awaited<ReturnType<typeof getTodasEtapasDoPedido>>>;
  userSetor: string;
  userDisplayName: string;
  userUid: string;
  podeEditarPedido: (pedido: Pedido) => boolean;
  podeEditarPrazo: (pedido: Pedido) => boolean;
  handleMarcarComoEntregue: (pedidoId: string, status: StatusPedido) => void;
  shouldShowActionsColumn: boolean;
  navigate: any;
}

export function PedidosTable(props: Readonly<PedidosTableProps>) {
  if (!props.pedidosFiltrados.length) 
    return (
      <div className="no-results">
        <p>Nenhum pedido encontrado.</p>
      </div>
    )


  return (
    <div className="table-responsive">
      <table className="pedidos-table">
        <thead>
          <tr>
            <th>Nº Pedido</th>
            <th>Cliente</th>
            <th>Responsável</th>
            <th>Serviço</th>
            <th>Prazo</th>
            <th>Etapas</th>
            <th>Status</th>
            {props.shouldShowActionsColumn && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {props.pedidosFiltrados
            .filter(p => p && p.servico && p.statusAtual && p.prazos)
            .map((pedido) => {
              try {
                return (
                  <PedidoRow
                    key={pedido.id}
                    pedido={pedido}
                    etapas={props.etapasPorPedido[pedido.id!]}
                    userSetor={props.userSetor}
                    userDisplayName={props.userDisplayName}
                    userUid={props.userUid}
                    podeEditarPedido={props.podeEditarPedido}
                    podeEditarPrazo={props.podeEditarPrazo}
                    handleMarcarComoEntregue={props.handleMarcarComoEntregue}
                    navigate={props.navigate}
                    showActions={props.shouldShowActionsColumn}
                  />
                );
              } catch (err) {
                console.error("Erro em PedidoRow:", err, pedido);
                return (
                  <tr key={pedido.id || Math.random()}>
                    <td colSpan={8} style={{ color: "red" }}>
                      Erro ao renderizar pedido: {pedido.id || "sem id"}
                    </td>
                  </tr>
                );
              }
            })}
        </tbody>
      </table>
    </div>
  );
}