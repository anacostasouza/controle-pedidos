/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from "exceljs";
import { formatarTempo } from "../../../utils/timeUtils";
import { getAuth } from "firebase/auth";
import { ATENDIMENTO_API_BASE_URL } from "../../../config/functionsApi";

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
        return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("pt-BR");
    }
    return "";
}

export const gerarExcelAtendimentos = async (
    atendimentos: Atendimento[]
): Promise<ArrayBuffer> => {
    if (!atendimentos || atendimentos.length === 0) return new ArrayBuffer(0);
    
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
            isAtendimentoDireto ? "Direto" : "Fila",          
            isConsumidor ? "Sim" : "Não",                     
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

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Atendimentos");

    worksheet.addRow(header);
    rows.forEach((row) => worksheet.addRow(row));

    worksheet.columns = [
        { width: 18 },
        { width: 30 },
        { width: 25 },
        { width: 20 },
        { width: 20 },
        { width: 10 },
        { width: 12 },
        { width: 18 },
        { width: 22 },
        { width: 20 },
        { width: 50 },
    ];

    return workbook.xlsx.writeBuffer();
};

export async function buscarAtendimentosPorPeriodo(dataInicio: string, dataFim: string) {
  const token = await getAuth().currentUser?.getIdToken();
  const response = await fetch(
        `${ATENDIMENTO_API_BASE_URL}/atendimentosPorPeriodo?inicio=${dataInicio}&fim=${dataFim}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

