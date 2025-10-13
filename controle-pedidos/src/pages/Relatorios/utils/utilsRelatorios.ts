/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from "xlsx";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import {
  TipoServicoLabels,
  SubTipoServicoLabels,
  SubTipoServico,
  TipoServico,
} from "../../../types/Servicos";
import {
  fetchStatusSequence,
  mapStatusWithEquivalence,
} from "../../../utils/firestoreUtils";
import type { StatusPedido, Pedido } from "../../../types/Pedidos";
import { capitalizeWords, formatDateTime, isStatusConcluido } from "../../../utils/formatUtils";

// Helpers

const getTipoServicoLabel = (tipo?: string): string => {
  if (!tipo) return "";
  return TipoServicoLabels[tipo as TipoServico] ?? tipo;
};

const getSubTipoServicoLabel = (subTipo?: string): string => {
  if (!subTipo) return "";
  return SubTipoServicoLabels[subTipo as SubTipoServico] ?? subTipo;
};

// Converte qualquer valor de data para Date de forma segura
const toDateSafe = (val: any): Date | null => {
  if (!val) return null;
  try {
    // Firestore Timestamp (web/admin)
    if (typeof val.toDate === "function") return val.toDate();
    // Admin Timestamp serializado: {_seconds, _nanoseconds}
    if (typeof val._seconds === "number") return new Date(val._seconds * 1000);
    // Web Timestamp serializado: {seconds, nanoseconds}
    if (typeof val.seconds === "number") return new Date(val.seconds * 1000);
    // Número em ms
    if (typeof val === "number") return new Date(val);
    // ISO string
    if (typeof val === "string") {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
};

// ---------------------- Gerar XLSX por serviço ----------------------

export const gerarExcelPedidosPorServico = async (
  pedidos: Pedido[]
): Promise<Buffer> => {
  if (!pedidos || pedidos.length === 0) return Buffer.from("");

  // Agrupa pedidos por serviço/subtipo
  const grupos: Record<string, Pedido[]> = {};
  for (const p of pedidos) {
    const key = `${p.servico?.tipo || ""}|${p.servico?.subTipo || ""}`;
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(p);
  }

  const workbook = XLSX.utils.book_new();

  // Para cada grupo cria uma aba
  for (const key of Object.keys(grupos)) {
    const [tipo, subTipo] = key.split("|");
    const statusSeq = await fetchStatusSequence(tipo, subTipo || undefined);

    const headers = [
      "Nº Pedido",
      "Cliente",
      "Responsável",
      "Serviço",
      "Subtipo",
      "Retrabalho", 
      "Status Atual",
      "Criado em",
      "Prazo Entrega",
      "Tempo Total",
      ...statusSeq.map((status) => `Status: ${status}`),
    ];

    const rows = grupos[key].map((p) => {
      // Histórico ordenado
      const historico = (p.historicoStatus || [])
        .map((h) => ({
          ...h,
          data: toDateSafe(h.data) || new Date(),
        }))
        .sort((a, b) => a.data.getTime() - b.data.getTime());

      // ------------------ Calcular Tempo Total HH:MM ------------------
      let tempoTotalStr = "00:00";
      const criadoEmDate = toDateSafe(p.criadoEm);
      if (criadoEmDate) {
        let fim = new Date();
        for (const h of historico) {
          if (isStatusConcluido(String(h.status))) {
            fim = h.data;
            break;
          }
        }
        const diffMs = fim.getTime() - criadoEmDate.getTime();
        let totalMinutos = Math.ceil(diffMs / (1000 * 60));
        if (totalMinutos <= 0) totalMinutos = 1;
        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;
        tempoTotalStr = `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
        if (tempoTotalStr === "00:00") tempoTotalStr = "00:01";
      }

      // Mapeia status para data/hora
      const statusToDate: Record<string, string> = {};
      statusSeq.forEach((colStatus) => {
        const h = historico.find(
          (h) => mapStatusWithEquivalence(h.status, tipo, subTipo) === colStatus
        );
        if (h) {
          statusToDate[colStatus] = `${h.data.toLocaleDateString(
            "pt-BR"
          )} ${h.data.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}`;
        }
      });

      const prazosEntregaDate = toDateSafe(p.prazos?.entrega);

      return [
        p.numeroPedido,
        p.nomeCliente,
        p.responsavel || "-",
        getTipoServicoLabel(p.servico?.tipo),
        getSubTipoServicoLabel(p.servico?.subTipo),
        p.retrabalho ? "Sim" : "Não",
        p.statusAtual,
        criadoEmDate ? formatDateTime(criadoEmDate) : "-",
        prazosEntregaDate ? formatDateTime(prazosEntregaDate) : "-",
        tempoTotalStr,
        ...statusSeq.map((status) => statusToDate[status] || "-"),
      ];
    });

    const nomeAba =
      capitalizeWords(tipo) + (subTipo ? ` - ${capitalizeWords(subTipo)}` : "");

    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    XLSX.utils.book_append_sheet(workbook, ws, nomeAba.substring(0, 31)); // aba Excel tem limite de 31 chars
  }

  // Retorna o buffer do arquivo Excel
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

// ---------------------- Filtros dinâmicos ----------------------

export interface ServicoStatus {
  tipo: string;
  subTipo?: string | null;
}

const normalizar = (texto: string): string => {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
};

export const fetchTiposServico = async (): Promise<string[]> => {
  const db = getFirestore();
  const snapshot = await getDocs(collection(db, "servicosStatus"));
  const servicos = snapshot.docs.map((doc) => doc.data() as ServicoStatus);

  const tiposUnicos = Array.from(new Set(servicos.map((s) => s.tipo)))
    .filter((t) => normalizar(t) !== "GALPAO")
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  return tiposUnicos;
};

export const fetchSubTiposServico = async (
  tipo?: string
): Promise<string[]> => {
  const db = getFirestore();
  const snapshot = await getDocs(collection(db, "servicosStatus"));
  const servicos = snapshot.docs.map((doc) => doc.data() as ServicoStatus);

  let subTipos = servicos
    .filter((s) => (tipo ? s.tipo === tipo : true))
    .map((s) => s.subTipo)
    .filter(Boolean) as string[];

  subTipos = Array.from(new Set(subTipos)).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  return subTipos;
};

export const fetchStatusPorServico = async (
  tipo: string,
  subTipo?: string
): Promise<StatusPedido[]> => {
  try {
    const status = await fetchStatusSequence(tipo, subTipo);
    return status;
  } catch (err) {
    console.error("Erro ao buscar status por serviço:", err);
    return [];
  }
};

export { getTipoServicoLabel, getSubTipoServicoLabel };
