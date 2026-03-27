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
    limit?: number;
    offset?: number;
}

interface ResultadoFiltros {
    atendimentos: any[];
    total: number;
    filtrosAplicados: string[];
    temMais: boolean;
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
        limit = 50,
        offset = 0,
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

    // ✅ FILTRO 1: Atendente
    if (atendenteUid) {
        query = query.where("atendenteUid", "==", atendenteUid);
        filtrosAplicados.push(`Atendente: ${atendenteUid}`);
    }

    // ✅ FILTRO 2: Tipo de Atendimento
    if (tipoAtendimento) {
        query = query.where("tipoAtendimento", "==", tipoAtendimento);
        filtrosAplicados.push(`Serviço: ${tipoAtendimento}`);
    }

    // ✅ FILTRO 3: Status (NO FIRESTORE, não em memória)
    if (status) {
        query = query.where("status", "==", status);
        filtrosAplicados.push(`Status: ${status}`);
    } else {
        // Se nenhum status específico, filtrar os "finalizados"
        query = query.where("status", "in", [
            "Finalizado",
            "Cancelado",
            "Adicionado ao controle de pedidos"
        ]);
        filtrosAplicados.push(`Status: Finalizados`);
    }

    // ✅ FILTRO 4: Tipo de Atendimento (Direto/Fila) - NO FIRESTORE
    if (tipo === "direto") {
        query = query.where("atendimentoDireto", "==", true);
        filtrosAplicados.push("Tipo: Direto");
    } else if (tipo === "fila") {
        query = query.where("atendimentoDireto", "==", false);
        filtrosAplicados.push("Tipo: Fila");
    }

    // ✅ FILTRO 5: Consumidor - NO FIRESTORE
    if (consumidor === true) {
        query = query.where("isConsumidor", "==", true);
        filtrosAplicados.push("Consumidor: Sim");
    } else if (consumidor === false) {
        query = query.where("isConsumidor", "==", false);
        filtrosAplicados.push("Consumidor: Não");
    }

    const snapshotTotal = await query.get();
    const total = snapshotTotal.size;

    const snapshot = await query
        .offset(offset)
        .limit(limit)
        .get();

    const atendimentos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    const temMais = (offset + limit) < total;

    return {
        atendimentos,
        total,
        filtrosAplicados,
        temMais,
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
    const stats = {
        totalFinalizados: 0,
        totalCancelados: 0,
        totalControlePedidos: 0,
        totalDireto: 0,
        totalFila: 0,
        totalConsumidor: 0,
        totalRegistrado: 0,
    };

    atendimentos.forEach((a: any) => {
        if (a.status === "Finalizado") stats.totalFinalizados++;
        if (a.status === "Cancelado") stats.totalCancelados++;
        if (a.status === "Adicionado ao controle de pedidos") stats.totalControlePedidos++;
        if (a.atendimentoDireto === true) stats.totalDireto++;
        if (a.atendimentoDireto !== true) stats.totalFila++;
        if (a.isConsumidor === true) stats.totalConsumidor++;
        if (a.isConsumidor !== true) stats.totalRegistrado++;
    });

    return stats;
}