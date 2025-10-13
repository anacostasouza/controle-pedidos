import { Timestamp } from "firebase-admin/firestore";

/**
 * Aplica todos os filtros recebidos do frontend em uma query do Firestore.
 * Use para montar a query principal e a de contagem.
 */
export function aplicarFiltrosPedidos(queryRef: FirebaseFirestore.Query, filtros: any): FirebaseFirestore.Query {
  if (filtros.filtroTipo)
    queryRef = queryRef.where("servico.tipo", "==", filtros.filtroTipo);

  if (filtros.filtroSubTipo)
    queryRef = queryRef.where("servico.subTipo", "==", filtros.filtroSubTipo);

  if (filtros.filtroStatus)
    queryRef = queryRef.where("statusAtual", "==", filtros.filtroStatus);

  // Filtrar por UID do responsável
  if (filtros.filtroResponsavelUid)
    queryRef = queryRef.where("responsavelUid", "==", filtros.filtroResponsavelUid);

  // Busca por cliente
  if (filtros.filtroCliente) {
    if (/^\d+$/.test(filtros.filtroCliente)) {
      queryRef = queryRef.where("numeroPedido", "==", Number(filtros.filtroCliente));
    } else {
      queryRef = queryRef.where("nomeCliente", "==", filtros.filtroCliente.toUpperCase());
    }
  }

  // Filtros booleanos
  if (filtros.filtroRequerArte === "true") {
    queryRef = queryRef.where("requerArte", "==", true);
  }
  if (filtros.filtroRequerArte === "false") {
    queryRef = queryRef.where("requerArte", "==", false);
  }
  if (filtros.filtroRequerGalpao === "true") {
    queryRef = queryRef.where("requerGalpao", "==", true);
  }
  if (filtros.filtroRequerGalpao === "false") {
    queryRef = queryRef.where("requerGalpao", "==", false);
  }

  // Filtrar por atrasados
  if (filtros.filtroAtrasados === "true") {
    queryRef = queryRef
      .where("statusAtual", "not-in", ["Entregue", "Concluído"])
      .where("prazos.entrega", "<", Timestamp.now());
  } else {
    queryRef = queryRef.where("statusAtual", "!=", "Entregue");
  }

  return queryRef;
}