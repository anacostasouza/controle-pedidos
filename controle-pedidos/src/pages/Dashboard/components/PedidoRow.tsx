/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Pedido, StatusPedido } from "../../../types/Pedidos"
import { getTodasEtapasDoPedido } from "../../../utils/FirestoreUtils";
import { capitalizeWords } from "../../../utils/FormatUtils";
import { formatDate, isPedidoAtrasado } from "../utils/dashboardUtils";
import { TipoServicoLabels, SubTipoServicoLabels } from "../../../types/Servicos";
import { podeMarcarEntregue } from "../../../utils/PermissionUtils";
import { Timestamp } from "firebase/firestore";

interface PedidoRowProps {
  pedido: Pedido;
  etapas: Awaited<ReturnType<typeof getTodasEtapasDoPedido>> | undefined;
  userSetor: string;
  userDisplayName: string;
  userUid: string;
  handleMarcarComoEntregue: (pedidoId: string, status: StatusPedido) => void;
  navigate: any;
  showActions: boolean;
  podeEditarPedido: (pedido: Pedido) => boolean;
}

export function PedidoRow(props: Readonly<PedidoRowProps>) {
  const { pedido, etapas, userSetor, userDisplayName, userUid, handleMarcarComoEntregue, navigate, showActions, podeEditarPedido } = props;

  const formatJustDate = (ts?: Timestamp) => ts ? ts.toDate().toLocaleDateString("pt-BR") : "";

  const tipoArteFirestoreValue = "ARTE"; 

  const isArte = pedido.servico?.tipo === tipoArteFirestoreValue;

  const usuario = {
    setor: userSetor,
    displayName: userDisplayName,
    uid: userUid
  };

  const podeMarcarComoEntregue = podeMarcarEntregue(pedido, usuario);

  if (!pedido || !pedido.servico || !pedido.statusAtual || !pedido.prazos) {
    return <tr><td colSpan={8}>Pedido inválido ou incompleto.</td></tr>;
  }

  return (
    <tr className={`pedidos-row ${pedido.retrabalho ? "retrabalho-row" : ""}`}>
      <td>
        {pedido.numeroPedido}
        <div className="badges-container">
          {pedido.retrabalho && (
            <span className="badge-retrabalho" title="Pedido de retrabalho">
              Retrabalho
            </span>
          )}
          {pedido.tipoDeEntrega && (
            <span 
              className={`badge-entrega badge-entrega-${pedido.tipoDeEntrega.toLowerCase()}`}
              title={`Tipo de entrega: ${pedido.tipoDeEntrega}`}
            >
              {pedido.tipoDeEntrega}
            </span>
          )}
        </div>
      </td>
      <td>{pedido.nomeCliente}</td>
      <td>{capitalizeWords(pedido.responsavel)}</td>
      <td>{TipoServicoLabels[pedido.servico.tipo]}{pedido.servico.subTipo ? ` (${SubTipoServicoLabels[pedido.servico.subTipo]})` : ""}</td>
      <td>
        <div><strong>Geral:</strong> {formatDate(pedido.prazos.entrega)} {pedido.horarioRetirada}</div>
        {!isArte && pedido.prazos.arte && (
          <div><strong>Arte:</strong> {formatJustDate(pedido.prazos.arte)}</div>
        )}
        {isPedidoAtrasado(pedido.prazos.entrega) && !["Concluído","Entregue"].includes(pedido.statusAtual) && <span className="atrasado-alert">Atrasado!</span>}
      </td>
      <td>
        {etapas ? (
          <>
            <span><strong>Geral:</strong> {etapas.geral.atual}/{etapas.geral.total}</span><br />
            {!isArte && etapas.arte && (
              <span><strong>Arte:</strong> {etapas.arte.atual}/{etapas.arte.total}</span>
            )}
            {etapas.arte && etapas.galpao && <br />}
            {etapas.galpao && (
              <span><strong>Galpão:</strong> {etapas.galpao.atual}/{etapas.galpao.total}</span>
            )}
          </>
        ) : <span>Carregando...</span>}
      </td>
      <td>{pedido.statusAtual}</td>
      {showActions && (
        <td>
          {podeMarcarComoEntregue && ["SUPORTE", "GESTAO"].includes(userSetor) ? (
            <>
              {pedido.statusAtual === "Concluído" && <button className="entregar-button" onClick={() => handleMarcarComoEntregue(pedido.id!, pedido.statusAtual)}>Marcar como entregue</button>}
              {podeEditarPedido(pedido) && (
                <button className="editar-button" onClick={() => navigate(`/editar-pedido/${pedido.id}`)}>Editar</button>
              )}
            </>
          ) : (
            <>
              {pedido.statusAtual === "Concluído" && podeMarcarComoEntregue && ["CAIXA", "BALCAO"].includes(userSetor) ? (
                <button className="entregar-button" onClick={() => handleMarcarComoEntregue(pedido.id!, pedido.statusAtual)}>Marcar como entregue</button>
              ) : (
                podeEditarPedido(pedido) && (
                  <button className="editar-button" onClick={() => navigate(`/editar-pedido/${pedido.id}`)}>Editar</button>
                )
              )}
            </>
          )}
        </td>
      )}
    </tr>
  );
}