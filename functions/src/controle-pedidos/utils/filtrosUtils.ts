import { Timestamp } from "firebase-admin/firestore";

export function aplicarFiltrosPedidos(queryRef: FirebaseFirestore.Query, filtros: any): FirebaseFirestore.Query {
  if (filtros.filtroTipo)
    queryRef = queryRef.where("servico.tipo", "==", filtros.filtroTipo);

  if (filtros.filtroSubTipo)
    queryRef = queryRef.where("servico.subTipo", "==", filtros.filtroSubTipo);

  if (filtros.filtroStatus)
    queryRef = queryRef.where("statusAtual", "==", filtros.filtroStatus);

  if (filtros.filtroResponsavelUid)
    queryRef = queryRef.where("responsavelUid", "==", filtros.filtroResponsavelUid);

  if (filtros.filtroCliente) {
    if (/^\d+$/.test(filtros.filtroCliente)) {
      queryRef = queryRef.where("numeroPedido", "==", Number(filtros.filtroCliente));
    } else {
      queryRef = queryRef.where("nomeCliente", "==", filtros.filtroCliente.toUpperCase());
    }
  }

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

  if (filtros.filtroAtrasados === "true") {
    queryRef = queryRef
      .where("statusAtual", "not-in", ["Entregue", "Concluído"])
      .where("prazos.entrega", "<", Timestamp.now());
    return queryRef;
  }

  if (filtros.filtroStatus) {
    queryRef = queryRef.where("statusAtual", "==", filtros.filtroStatus);
  }

  else if (filtros.filtroOcultarEntregues === "true") {
    queryRef = queryRef.where("statusAtual", "not-in", ["Entregue"]);
  }

  return queryRef;
}