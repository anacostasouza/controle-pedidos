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
    estatisticas: {
        totalFinalizados: number;
        totalCancelados: number;
        totalControlePedidos: number;
        totalDireto: number;
        totalFila: number;
        totalConsumidor: number;
        totalRegistrado: number;
    };
    temMais: boolean;
}

async function contarDocumentos(query: any): Promise<number> {
    try {
        // Prefer aggregation count to avoid full document reads.
        // @ts-ignore
        const countSnap = await query.count().get();
        // @ts-ignore
        return countSnap.data().count || 0;
    } catch {
        // Fallback for environments without count aggregation support.
        const snapshot = await query.get();
        return snapshot.size;
    }
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
        limit,
        offset,
    } = filtros;

    if (!dataInicio || !dataFim) {
        throw new Error("Os campos dataInicio e dataFim são obrigatórios.");
    }

    const inicio = Timestamp.fromDate(new Date(dataInicio));
    const fimDate = new Date(dataFim);
    fimDate.setHours(23, 59, 59, 999);
    const fim = Timestamp.fromDate(fimDate);

    let queryBase = admin
        .firestore()
        .collection("atendimentos")
        .where("criadoEm", ">=", inicio)
        .where("criadoEm", "<=", fim);

    const filtrosAplicados: string[] = [
        `Período: ${dataInicio} a ${dataFim}`,
    ];

    // ✅ FILTRO 1: Atendente
    if (atendenteUid) {
        queryBase = queryBase.where("atendenteUid", "==", atendenteUid);
        filtrosAplicados.push(`Atendente: ${atendenteUid}`);
    }

    // ✅ FILTRO 2: Tipo de Atendimento
    if (tipoAtendimento) {
        queryBase = queryBase.where("tipoAtendimento", "==", tipoAtendimento);
        filtrosAplicados.push(`Serviço: ${tipoAtendimento}`);
    }

    // ✅ FILTRO 4: Tipo de Atendimento (Direto/Fila) - NO FIRESTORE
    if (tipo === "direto") {
        queryBase = queryBase.where("atendimentoDireto", "==", true);
        filtrosAplicados.push("Tipo: Direto");
    } else if (tipo === "fila") {
        queryBase = queryBase.where("atendimentoDireto", "==", false);
        filtrosAplicados.push("Tipo: Fila");
    }

    // ✅ FILTRO 5: Consumidor - NO FIRESTORE
    if (consumidor === true) {
        queryBase = queryBase.where("isConsumidor", "==", true);
        filtrosAplicados.push("Consumidor: Sim");
    } else if (consumidor === false) {
        queryBase = queryBase.where("isConsumidor", "==", false);
        filtrosAplicados.push("Consumidor: Não");
    }

    let queryFiltrada = queryBase;

    // ✅ FILTRO 3: Status (NO FIRESTORE, não em memória)
    if (status) {
        queryFiltrada = queryFiltrada.where("status", "==", status);
        filtrosAplicados.push(`Status: ${status}`);
    } else {
        // Se nenhum status específico, filtrar os "finalizados"
        queryFiltrada = queryFiltrada.where("status", "in", [
            "Finalizado",
            "Cancelado",
            "Adicionado ao controle de pedidos"
        ]);
        filtrosAplicados.push(
            "Status: Finalizado, Cancelado e Adicionado ao controle de pedidos"
        );
    }

    const temPaginacaoExplicita =
        limit !== undefined || offset !== undefined;

    const paginaLimit = Number.isFinite(Number(limit))
        ? Math.min(Math.max(Number(limit), 1), 100)
        : 50;
    const paginaOffset = Number.isFinite(Number(offset))
        ? Math.max(Number(offset), 0)
        : 0;

    const total = await contarDocumentos(queryFiltrada);

    const snapshot = temPaginacaoExplicita
        ? await queryFiltrada
            .offset(paginaOffset)
            .limit(paginaLimit)
            .get()
        : await queryFiltrada.get();

    const atendimentos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    let totalFinalizados = 0;
    let totalCancelados = 0;
    let totalControlePedidos = 0;

    if (status === "Finalizado") {
        totalFinalizados = total;
    } else if (status === "Cancelado") {
        totalCancelados = total;
    } else if (status === "Adicionado ao controle de pedidos") {
        totalControlePedidos = total;
    } else {
        totalFinalizados = await contarDocumentos(queryBase.where("status", "==", "Finalizado"));
        totalCancelados = await contarDocumentos(queryBase.where("status", "==", "Cancelado"));
        totalControlePedidos = await contarDocumentos(
            queryBase.where("status", "==", "Adicionado ao controle de pedidos")
        );
    }

    const totalDireto = tipo === "direto"
        ? total
        : tipo === "fila"
            ? 0
            : await contarDocumentos(queryFiltrada.where("atendimentoDireto", "==", true));

    const totalFila = total - totalDireto;

    const totalConsumidor = consumidor === true
        ? total
        : consumidor === false
            ? 0
            : await contarDocumentos(queryFiltrada.where("isConsumidor", "==", true));

    const totalRegistrado = total - totalConsumidor;

    const temMais = temPaginacaoExplicita
        ? (paginaOffset + paginaLimit) < total
        : false;

    return {
        atendimentos,
        total,
        filtrosAplicados,
        estatisticas: {
            totalFinalizados,
            totalCancelados,
            totalControlePedidos,
            totalDireto,
            totalFila,
            totalConsumidor,
            totalRegistrado,
        },
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