/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from "exceljs";
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
} from "../../../utils/FirestoreUtils";
import type { StatusPedido, Pedido } from "../../../types/Pedidos";
import { formatDateTime, isStatusConcluido } from "../../../utils/FormatUtils";

// Helpers

const getTipoServicoLabel = (tipo?: string): string => {
  if (!tipo) return "";
  return TipoServicoLabels[tipo as TipoServico] ?? tipo;
};

const getSubTipoServicoLabel = (subTipo?: string): string => {
  if (!subTipo) return "";
  return SubTipoServicoLabels[subTipo as SubTipoServico] ?? subTipo;
};

export function formatDate(date: any): string {
  if (!date) return "-";
  try {
    // Firestore Timestamp
    if (typeof date.toDate === "function") date = date.toDate();
    // Admin Timestamp serializado
    if (typeof date._seconds === "number") date = new Date(date._seconds * 1000);
    // Web Timestamp serializado
    if (typeof date.seconds === "number") date = new Date(date.seconds * 1000);
    // String ou Date
    if (typeof date === "string" || date instanceof Date) {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "-";
      return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return "-";
  } catch {
    return "-";
  }
}


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

// ---------------------- Gerar XLSX consolidado ----------------------

export const gerarExcelPedidosPorServico = async (
  pedidos: Pedido[]
): Promise<ArrayBuffer> => {
  if (!pedidos || pedidos.length === 0) return new ArrayBuffer(0);

  const workbook = new ExcelJS.Workbook();

  // Coletar todos os status únicos de todos os pedidos
  const todosStatusSet = new Set<string>();
  
  // Map para cachear status por serviço
  const statusCache = new Map<string, StatusPedido[]>();

  // Primeira passagem: coletar todos os status possíveis
  for (const p of pedidos) {
    const tipo = p.servico?.tipo || "";
    const subTipo = p.servico?.subTipo || "";
    const cacheKey = `${tipo}|${subTipo}`;
    
    let statusSeq: StatusPedido[];
    if (statusCache.has(cacheKey)) {
      statusSeq = statusCache.get(cacheKey)!;
    } else {
      statusSeq = await fetchStatusSequence(tipo, subTipo || undefined);
      statusCache.set(cacheKey, statusSeq);
    }
    
    statusSeq.forEach(s => todosStatusSet.add(s));
  }

  const todosStatus = Array.from(todosStatusSet).sort();

  // Montar headers
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
    "Tempo Total (HH:MM)",
    ...todosStatus.map((status) => `${status}`),
  ];

  // Processar cada pedido
  const rows = await Promise.all(
    pedidos.map(async (p) => {
      const tipo = p.servico?.tipo || "";
      const subTipo = p.servico?.subTipo || "";
      const cacheKey = `${tipo}|${subTipo}`;
      const statusSeq = statusCache.get(cacheKey)!;

      // Histórico ordenado
      const historico = (p.historicoStatus || [])
        .map((h) => ({
          ...h,
          data: toDateSafe(h.data) || new Date(),
        }))
        .sort((a, b) => a.data.getTime() - b.data.getTime());

      // Calcular Tempo Total HH:MM
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
      
      // Para cada status possível no pedido, verificar se passou por ele
      todosStatus.forEach((colStatus) => {
        // Verifica se esse status pertence ao fluxo deste tipo de serviço
        if (!statusSeq.includes(colStatus as StatusPedido)) {
          statusToDate[colStatus] = "-"; // Status não aplicável a este serviço
          return;
        }

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
        } else {
          statusToDate[colStatus] = ""; // Status aplicável mas ainda não alcançado
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
        ...todosStatus.map((status) => statusToDate[status] || ""),
      ];
    })
  );

  const worksheet = workbook.addWorksheet("Relatório Consolidado");
  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(row));

  worksheet.columns = [
    { width: 10 },
    { width: 30 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 10 },
    { width: 15 },
    { width: 18 },
    { width: 18 },
    { width: 12 },
    ...todosStatus.map(() => ({ width: 18 })),
  ];

  return workbook.xlsx.writeBuffer();
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
    if (import.meta.env.DEV) {
      console.error("Erro ao buscar status por serviço:", err);
    }
    return [];
  }
};

export { getTipoServicoLabel, getSubTipoServicoLabel };
