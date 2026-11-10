import { Timestamp } from "firebase-admin/firestore";

export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function extractTimestampMs(ts: any): number | null {
  if (!ts) return null;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  if (typeof ts._seconds === "number") return ts._seconds * 1000;
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "string" || typeof ts === "number") {
    const ms = new Date(ts).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

export function aplicarFiltrosPedidos(queryRef: FirebaseFirestore.Query, filtros: any): FirebaseFirestore.Query {

  if (filtros.filtroTipo)
    queryRef = queryRef.where("servico.tipo", "==", filtros.filtroTipo);

  if (filtros.filtroSubTipo)
    queryRef = queryRef.where("servico.subTipo", "==", filtros.filtroSubTipo);

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
    const clienteTermo = String(filtros.filtroCliente).trim();
    if (clienteTermo) {
      if (/^\d+$/.test(clienteTermo)) {
        queryRef = queryRef.where("numeroPedido", "==", Number(clienteTermo));
      } else {
        queryRef = queryRef.where("nomeCliente", "==", clienteTermo.toUpperCase());
      }
    }
  }

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

  // Prioridade: Atrasados > Status específico > Ocultar entregues
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

export function filtrarPedidosEmMemoria(pedidos: any[], filtros: any, nowMs = Date.now()): any[] {
  const termoCliente = typeof filtros.filtroCliente === "string" ? filtros.filtroCliente.trim() : "";
  const isClienteNumerico = termoCliente !== "" && /^\d+$/.test(termoCliente);
  const termoClienteNorm = termoCliente ? normalizarTexto(termoCliente) : "";

  const termoRespRaw = typeof filtros.filtroResponsavelNomePrefixo === "string"
    ? filtros.filtroResponsavelNomePrefixo.trim()
    : typeof filtros.filtroResponsavel === "string"
      ? filtros.filtroResponsavel.trim()
      : "";
  const termoRespNorm = termoRespRaw ? normalizarTexto(termoRespRaw) : "";

  const inicioInclusaoMs = filtros.dataInicioInclusao
    ? new Date(String(filtros.dataInicioInclusao)).getTime()
    : null;
  const fimInclusaoMs = filtros.dataFimInclusao
    ? new Date(`${String(filtros.dataFimInclusao)}T23:59:59.999Z`).getTime()
    : null;

  const inicioRetiradaMs = filtros.dataInicioRetirada
    ? new Date(`${String(filtros.dataInicioRetirada)}T00:00:00.000Z`).getTime()
    : null;
  const fimRetiradaMs = filtros.dataFimRetirada
    ? new Date(`${String(filtros.dataFimRetirada)}T23:59:59.999Z`).getTime()
    : null;

  return pedidos.filter((p) => {
    if (filtros.filtroTipo && p.servico?.tipo !== filtros.filtroTipo) {
      return false;
    }

    if (filtros.filtroSubTipo && p.servico?.subTipo !== filtros.filtroSubTipo) {
      return false;
    }

    if (filtros.filtroResponsavelUid && p.responsavelUid !== filtros.filtroResponsavelUid) {
      return false;
    }

    if (termoRespNorm.length >= 2) {
      const respNorm = normalizarTexto(String(p.responsavelNomeNormalizado || p.responsavel || ""));
      if (!respNorm.includes(termoRespNorm)) {
        return false;
      }
    }

    if (termoCliente) {
      if (isClienteNumerico) {
        const numeroMatch = Number(p.numeroPedido) === Number(termoCliente) ||
          String(p.numeroPedido ?? "").includes(termoCliente);
        const nomeMatch = normalizarTexto(String(p.nomeCliente || "")).includes(termoClienteNorm);
        if (!numeroMatch && !nomeMatch) {
          return false;
        }
      } else {
        const nomeNorm = normalizarTexto(String(p.nomeCliente || ""));
        if (!nomeNorm.includes(termoClienteNorm)) {
          return false;
        }
      }
    }

    if (filtros.filtroRequerArte === "true" && p.requerArte !== true) {
      return false;
    } else if (filtros.filtroRequerArte === "false" && p.requerArte === true) {
      return false;
    }

    if (filtros.filtroRequerGalpao === "true" && p.requerGalpao !== true) {
      return false;
    } else if (filtros.filtroRequerGalpao === "false" && p.requerGalpao === true) {
      return false;
    }

    const entregaMs = extractTimestampMs(p.prazos?.entrega);

    // Prioridade: Atrasados > Status específico > Ocultar entregues
    if (filtros.filtroAtrasados === "true") {
      if (p.statusAtual === "Entregue" || p.statusAtual === "Concluído") {
        return false;
      }
      if (entregaMs === null || entregaMs >= nowMs) {
        return false;
      }
    } else if (filtros.filtroStatus) {
      if (p.statusAtual !== filtros.filtroStatus) {
        return false;
      }
    } else if (filtros.filtroOcultarEntregues === "true") {
      if (p.statusAtual === "Entregue") {
        return false;
      }
    }

    if (inicioInclusaoMs !== null || fimInclusaoMs !== null) {
      const criadoMs = extractTimestampMs(p.criadoEm);
      if (criadoMs === null) return false;
      if (inicioInclusaoMs !== null && criadoMs < inicioInclusaoMs) return false;
      if (fimInclusaoMs !== null && criadoMs > fimInclusaoMs) return false;
    }

    if (inicioRetiradaMs !== null || fimRetiradaMs !== null) {
      if (entregaMs === null) return false;
      if (inicioRetiradaMs !== null && entregaMs < inicioRetiradaMs) return false;
      if (fimRetiradaMs !== null && entregaMs > fimRetiradaMs) return false;
    }

    return true;
  });
}

export function ordenarPedidosPorEntrega(pedidos: any[]): any[] {
  return [...pedidos].sort((a, b) => {
    const aMs = extractTimestampMs(a.prazos?.entrega);
    const bMs = extractTimestampMs(b.prazos?.entrega);
    if (aMs !== null && bMs !== null && aMs !== bMs) {
      return aMs - bMs;
    }
    if (aMs !== null && bMs === null) return -1;
    if (aMs === null && bMs !== null) return 1;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}