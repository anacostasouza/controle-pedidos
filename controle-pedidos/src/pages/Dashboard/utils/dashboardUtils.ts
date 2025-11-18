/* eslint-disable @typescript-eslint/no-explicit-any */
import { Timestamp } from "firebase/firestore";
import type { Pedido, StatusPedido } from "../../../types/Pedidos";
import {type TipoServicoValue, type SubTipoServicoValue } from "../../../types/Servicos";
import { fetchStatusSequence } from "../../../utils/FirestoreUtils";

export function convertToTimestamp(ts: any): Timestamp | null {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts;
  // Aceita formato do backend: { _seconds, _nanoseconds }
  if (typeof ts._seconds === "number" && typeof ts._nanoseconds === "number") {
    return new Timestamp(ts._seconds, ts._nanoseconds);
  }
  // Aceita formato padrão: { seconds, nanoseconds }
  if (typeof ts.seconds === "number" && typeof ts.nanoseconds === "number") {
    return new Timestamp(ts.seconds, ts.nanoseconds);
  }
  return null;
}

export function formatDate(timestamp?: any): string {
  if (!timestamp) return "-";
  // Firestore Timestamp
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toLocaleDateString("pt-BR");
  }
  // Backend: { _seconds, _nanoseconds }
  if (typeof timestamp === "object" && "_seconds" in timestamp && typeof timestamp._seconds === "number") {
    const date = new Date(timestamp._seconds * 1000);
    return date.toLocaleDateString("pt-BR");
  }
  // Backend: { seconds, nanoseconds }
  if (typeof timestamp === "object" && "seconds" in timestamp && typeof timestamp.seconds === "number") {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("pt-BR");
  }
  return "-";
}

export function formatJustDate(timestamp?: Timestamp): string {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function isPedidoAtrasado(entrega?: any): boolean {
  if (!entrega) return false;
  // Firestore Timestamp
  if (typeof entrega.toDate === "function") {
    return entrega.toDate().getTime() < new Date().getTime();
  }
  // Backend: { _seconds, _nanoseconds }
  if (typeof entrega === "object" && "_seconds" in entrega && typeof entrega._seconds === "number") {
    return entrega._seconds * 1000 < Date.now();
  }
  // Backend: { seconds, nanoseconds }
  if (typeof entrega === "object" && "seconds" in entrega && typeof entrega.seconds === "number") {
    return entrega.seconds * 1000 < Date.now();
  }
  return false;
}

const statusCache = new Map<string, StatusPedido[]>();

export async function gerarOpcoesStatus(
  pedidos: Pedido[],
  filtroServico: TipoServicoValue | "",
  filtroSubTipo: SubTipoServicoValue | ""
): Promise<string[]> {
  const statusSet = new Set<string>();
  for (const p of pedidos) {
    if (filtroServico && p.servico.tipo !== filtroServico) continue;
    if (filtroSubTipo && p.servico.subTipo !== filtroSubTipo) continue;

    const cacheKey = `${p.servico.tipo}_${p.servico.subTipo ?? "null"}`;
    let statusDisponiveis = statusCache.get(cacheKey);
    if (!statusDisponiveis) {
      try {
        statusDisponiveis = await fetchStatusSequence(p.servico.tipo, p.servico.subTipo ?? undefined);
        statusCache.set(cacheKey, statusDisponiveis);
      } catch {
        continue;
      }
    }
    statusDisponiveis.forEach((s) => statusSet.add(s));
  }
  return Array.from(statusSet);
}
