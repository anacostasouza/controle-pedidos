/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from "xlsx";
import { formatarTempo } from "../../../utils/timeUtils";
import { getAuth } from "firebase/auth";

export interface Atendimento {
    codigoPedido: string;
    nomeCliente: string;
    tipoAtendimento: string;
    status: string;
    atendente?: string;
    tempoEspera?: string | number; 
    tempoAtendimento?: string | number;
    criadoEm?: any; 
    historico?: any[];
    atendimentoDireto?: boolean;
    isConsumidor?: boolean;
}

function formatarDataParaExcel(data: any): string {
    if (!data) return "";
    if (typeof data.toDate === "function") return data.toDate().toLocaleString("pt-BR");
    if (typeof data.seconds === "number") return new Date(data.seconds * 1000).toLocaleString("pt-BR");
    if (typeof data._seconds === "number") return new Date(data._seconds * 1000).toLocaleString("pt-BR");
    if (typeof data === "string" || data instanceof Date) {
        const d = new Date(data);
        return isNaN(d.getTime()) ? "" : d.toLocaleString("pt-BR");
    }
    return "";
}

export const gerarExcelAtendimentos = async (
    atendimentos: Atendimento[]
): Promise<Buffer> => {
    if (!atendimentos || atendimentos.length === 0) return Buffer.from("");
    
    const header = [
        "Código do Pedido",
        "Cliente",
        "Tipo de Atendimento",
        "Status",
        "Atendente",
        "Tipo",              
        "Consumidor",        
        "Tempo de Espera",
        "Tempo de Atendimento",
        "Criado em",
        "Histórico",
    ];

    const rows = atendimentos.map((a) => {
        const isAtendimentoDireto = a.atendimentoDireto === true;
        const isConsumidor = a.isConsumidor === true;
        
        return [
            a.codigoPedido || "",
            a.nomeCliente,
            a.tipoAtendimento,
            a.status,
            a.atendente || "",
            isAtendimentoDireto ? "Direto" : "Fila",           // ✅ NOVA COLUNA
            isConsumidor ? "Sim" : "Não",                      // ✅ NOVA COLUNA
            isAtendimentoDireto ? "-" : (typeof a.tempoEspera === "number" ? formatarTempo(a.tempoEspera) : a.tempoEspera || ""),
            isAtendimentoDireto ? "-" : (typeof a.tempoAtendimento === "number" ? formatarTempo(a.tempoAtendimento) : a.tempoAtendimento || ""),
            formatarDataParaExcel(a.criadoEm),
            a.historico
                ? a.historico
                      .map(
                          (h) =>
                              `${h.status} (${formatarDataParaExcel(h.data)})`
                      )
                      .join(" | ")
                : "",
        ];
    });

    const worksheetData = [header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    ws["!cols"] = [
        { wch: 18 }, // Código do Pedido
        { wch: 30 }, // Cliente
        { wch: 25 }, // Tipo de Atendimento
        { wch: 20 }, // Status
        { wch: 20 }, // Atendente
        { wch: 10 }, // Tipo
        { wch: 12 }, // Consumidor
        { wch: 18 }, // Tempo de Espera
        { wch: 22 }, // Tempo de Atendimento
        { wch: 20 }, // Criado em
        { wch: 50 }, // Histórico
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atendimentos");

    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
};

export async function buscarAtendimentosPorPeriodo(dataInicio: string, dataFim: string) {
  const token = await getAuth().currentUser?.getIdToken();
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/atendimentosPorPeriodo?inicio=${dataInicio}&fim=${dataFim}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

