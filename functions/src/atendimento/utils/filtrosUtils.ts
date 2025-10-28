import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

interface FiltrosHistorico {
    dataInicio: string;
    dataFim: string;
    status?: string;
    atendenteUid?: string;
    tipo?: "direto" | "fila";
    consumidor?: boolean;
    tipoAtendimento?: string;
}

interface ResultadoFiltros {
    atendimentos: any[];
    total: number;
    filtrosAplicados: string[];
}

export async function buscarAtendimentosComFiltros(
    filtros: FiltrosHistorico
): Promise<ResultadoFiltros> {
    const {
        dataInicio,
        dataFim,
        status,
        atendenteUid,
        tipo,
        consumidor,
        tipoAtendimento,
    } = filtros;

    if (!dataInicio || !dataFim) {
        throw new Error("Os campos dataInicio e dataFim são obrigatórios.");
    }

    const inicio = Timestamp.fromDate(new Date(dataInicio));
    const fimDate = new Date(dataFim);
    fimDate.setHours(23, 59, 59, 999);
    const fim = Timestamp.fromDate(fimDate);

    let query = admin
        .firestore()
        .collection("atendimentos")
        .where("criadoEm", ">=", inicio)
        .where("criadoEm", "<=", fim);

    const filtrosAplicados: string[] = [
        `Período: ${dataInicio} a ${dataFim}`,
    ];

    if (atendenteUid) {
        query = query.where("atendenteUid", "==", atendenteUid);
        filtrosAplicados.push(`Atendente: ${atendenteUid}`);
    }

    if (tipoAtendimento) {
        query = query.where("tipoAtendimento", "==", tipoAtendimento);
        filtrosAplicados.push(`Serviço: ${tipoAtendimento}`);
    }

    const snapshot = await query.get();
    let atendimentos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    atendimentos = atendimentos.filter((a: any) =>
        ["Finalizado", "Cancelado", "Adicionado ao controle de pedidos"].includes(a.status)
    );

    if (status) {
        atendimentos = atendimentos.filter((a: any) => a.status === status);
        filtrosAplicados.push(`Status: ${status}`);
    }

    if (tipo === "direto") {
        atendimentos = atendimentos.filter((a: any) => a.atendimentoDireto === true);
        filtrosAplicados.push("Tipo: Direto");
    } else if (tipo === "fila") {
        atendimentos = atendimentos.filter((a: any) => a.atendimentoDireto !== true);
        filtrosAplicados.push("Tipo: Fila");
    }

    if (consumidor === true) {
        atendimentos = atendimentos.filter((a: any) => a.isConsumidor === true);
        filtrosAplicados.push("Consumidor: Sim");
    } else if (consumidor === false) {
        atendimentos = atendimentos.filter((a: any) => a.isConsumidor !== true);
        filtrosAplicados.push("Consumidor: Não");
    }

    return {
        atendimentos,
        total: atendimentos.length,
        filtrosAplicados,
    };
}

export function validarFiltros(
    query: any
): {
    valido: boolean;
    erro?: string;
} {
    const { dataInicio, dataFim } = query;

    if (!dataInicio || !dataFim) {
        return {
            valido: false,
            erro: "Os campos dataInicio e dataFim são obrigatórios.",
        };
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
        return {
            valido: false,
            erro: "Datas inválidas",
        };
    }

    if (inicio > fim) {
        return {
            valido: false,
            erro: "dataInicio não pode ser maior que dataFim.",
        };
    }

    const umAnoEmMs = 365 * 24 * 60 * 60 * 1000;
    if (fim.getTime() - inicio.getTime() > umAnoEmMs) {
        return {
            valido: false,
            erro: "Período máximo permitido: 1 ano",
        };
    }

    return { valido: true };
}

export function extrairAtendentesUnicos(atendimentos: any[]): string[] {
    const atendentesSet = new Set<string>();
    atendimentos.forEach((a: any) => {
        if (a.atendenteUid) {
            atendentesSet.add(a.atendenteUid);
        }
    });
    return Array.from(atendentesSet);
}

export function calcularEstatisticas(atendimentos: any[]): {
    totalFinalizados: number;
    totalCancelados: number;
    totalControlePedidos: number;
    totalDireto: number;
    totalFila: number;
    totalConsumidor: number;
    totalRegistrado: number;
} {
    return {
        totalFinalizados: atendimentos.filter((a: any) => a.status === "Finalizado").length,
        totalCancelados: atendimentos.filter((a: any) => a.status === "Cancelado").length,
        totalControlePedidos: atendimentos.filter((a: any) => a.status === "Adicionado ao controle de pedidos").length,
        totalDireto: atendimentos.filter((a: any) => a.atendimentoDireto === true).length,
        totalFila: atendimentos.filter((a: any) => a.atendimentoDireto !== true).length,
        totalConsumidor: atendimentos.filter((a: any) => a.isConsumidor === true).length,
        totalRegistrado: atendimentos.filter((a: any) => a.isConsumidor !== true).length,
    };
}