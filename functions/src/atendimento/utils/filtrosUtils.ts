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

type HistoricoCacheEntry = {
    value: ResultadoFiltros;
    expiresAt: number;
};

const historicoCache = new Map<string, HistoricoCacheEntry>();

function getHistoricoCacheTtlMs(): number {
    const configured = process.env.HISTORICO_ATENDIMENTOS_CACHE_TTL_MS;
    if (configured !== undefined) {
        const parsed = Number(configured);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    }
    return process.env.NODE_ENV === "test" ? 0 : 30_000;
}

export function clearHistoricoAtendimentosCache(): void {
    historicoCache.clear();
}

export async function buscarAtendimentosComFiltros(
    filtros: FiltrosHistorico
): Promise<ResultadoFiltros> {
    const cacheTtlMs = getHistoricoCacheTtlMs();
    const cacheKey = cacheTtlMs > 0 ? JSON.stringify(filtros) : "";
    if (cacheTtlMs > 0) {
        const cached = historicoCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.value;
        }
        if (cached) {
            historicoCache.delete(cacheKey);
        }
    }

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

    let resultado: ResultadoFiltros;

    if (!temPaginacaoExplicita) {
        const snapshot = await queryFiltrada.limit(2000).get();
        const atendimentos = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        const total = atendimentos.length;
        resultado = {
            atendimentos,
            total,
            filtrosAplicados,
            estatisticas: calcularEstatisticas(atendimentos),
            temMais: snapshot.docs.length === 2000,
        };
    } else {
        const [total, snapshot] = await Promise.all([
            contarDocumentos(queryFiltrada),
            queryFiltrada.offset(paginaOffset).limit(paginaLimit).get(),
        ]);

        const atendimentos = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        const [
            totalFinalizados,
            totalCancelados,
            totalControlePedidos,
            totalDireto,
            totalConsumidor,
        ] = await Promise.all([
            status === "Finalizado"
                ? Promise.resolve(total)
                : status
                    ? Promise.resolve(0)
                    : contarDocumentos(queryBase.where("status", "==", "Finalizado")),
            status === "Cancelado"
                ? Promise.resolve(total)
                : status
                    ? Promise.resolve(0)
                    : contarDocumentos(queryBase.where("status", "==", "Cancelado")),
            status === "Adicionado ao controle de pedidos"
                ? Promise.resolve(total)
                : status
                    ? Promise.resolve(0)
                    : contarDocumentos(
                        queryBase.where("status", "==", "Adicionado ao controle de pedidos")
                    ),
            tipo === "direto"
                ? Promise.resolve(total)
                : tipo === "fila"
                    ? Promise.resolve(0)
                    : contarDocumentos(queryFiltrada.where("atendimentoDireto", "==", true)),
            consumidor === true
                ? Promise.resolve(total)
                : consumidor === false
                    ? Promise.resolve(0)
                    : contarDocumentos(queryFiltrada.where("isConsumidor", "==", true)),
        ]);

        const totalFila = total - totalDireto;
        const totalRegistrado = total - totalConsumidor;

        resultado = {
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
            temMais: (paginaOffset + paginaLimit) < total,
        };
    }

    if (cacheTtlMs > 0) {
        if (historicoCache.size >= 100) {
            historicoCache.clear();
        }
        historicoCache.set(cacheKey, {
            value: resultado,
            expiresAt: Date.now() + cacheTtlMs,
        });
    }

    return resultado;
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