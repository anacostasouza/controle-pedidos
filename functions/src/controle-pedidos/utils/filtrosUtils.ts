import { Timestamp } from "firebase-admin/firestore";

export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function aplicarFiltrosPedidos(queryRef: FirebaseFirestore.Query, filtros: any): FirebaseFirestore.Query {
  // ✅ FILTROS DE SERVIÇO
  if (filtros.filtroTipo)
    queryRef = queryRef.where("servico.tipo", "==", filtros.filtroTipo);

  if (filtros.filtroSubTipo)
    queryRef = queryRef.where("servico.subTipo", "==", filtros.filtroSubTipo);

  // ✅ FILTROS DE RESPONSÁVEL E CLIENTE
  if (filtros.filtroResponsavelUid)
    queryRef = queryRef.where("responsavelUid", "==", filtros.filtroResponsavelUid);

  if (filtros.filtroResponsavelNomePrefixo) {
    const prefixo = normalizarTexto(String(filtros.filtroResponsavelNomePrefixo));
    if (prefixo.length >= 2) {
      queryRef = queryRef
        .where("responsavelNomeNormalizado", ">=", prefixo)
        .where("responsavelNomeNormalizado", "<=", `${prefixo}\uf8ff`);
    }
  }

  if (filtros.filtroCliente) {
    if (/^\d+$/.test(filtros.filtroCliente)) {
      queryRef = queryRef.where("numeroPedido", "==", Number(filtros.filtroCliente));
    } else {
      queryRef = queryRef.where("nomeCliente", "==", filtros.filtroCliente.toUpperCase());
    }
  }

  // ✅ FILTROS DE REQUERIMENTOS
  if (filtros.filtroRequerArte === "true") {
    queryRef = queryRef.where("requerArte", "==", true);
  } else if (filtros.filtroRequerArte === "false") {
    queryRef = queryRef.where("requerArte", "==", false);
  }

  if (filtros.filtroRequerGalpao === "true") {
    queryRef = queryRef.where("requerGalpao", "==", true);
  } else if (filtros.filtroRequerGalpao === "false") {
    queryRef = queryRef.where("requerGalpao", "==", false);
  }

  // ✅ FILTRO DE STATUS - Tratamento exclusivo (evita duplicatas)
  // Primeiridade: Atrasados > Status específico > Ocultar entregues
  if (filtros.filtroAtrasados === "true") {
    // Pedidos não entregues com prazo vencido
    queryRef = queryRef
      .where("statusAtual", "not-in", ["Entregue", "Concluído"])
      .where("prazos.entrega", "<", Timestamp.now());
  } else if (filtros.filtroStatus) {
    // Status específico selecionado
    queryRef = queryRef.where("statusAtual", "==", filtros.filtroStatus);
  } else if (filtros.filtroOcultarEntregues === "true") {
    // Ocultar apenas os entregues
    queryRef = queryRef.where("statusAtual", "not-in", ["Entregue"]);
  }

  return queryRef;
}