import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { FiltrosPedidosVenda, PagedPedidosVenda, PedidoVenda } from '../contracts';

const DEFAULT_KPIS = {
    totalPedidos: 0,
    totalValor: 0,
    totalConfirmados: 0,
    totalValorConfirmados: 0,
    totalAbertos: 0,
    totalValorAbertos: 0,
    ticketMedio: 0,
};

export function usePedidos(filtrosIniciais?: FiltrosPedidosVenda) {
    const [filtros, setFiltros] = useState<FiltrosPedidosVenda>(filtrosIniciais || { page: 1, limit: 50 });
    const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
    const [kpis, setKpis] = useState(DEFAULT_KPIS);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const carregarPedidos = useCallback(async (novosFiltros?: FiltrosPedidosVenda, force = false) => {
        const query = novosFiltros ?? filtros;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (query.page) params.append('page', String(query.page));
            if (query.limit) params.append('limit', String(query.limit));
            if (query.status && query.status !== 'todos') params.append('status', query.status);
            if (query.data_inicio) params.append('data_inicio', query.data_inicio);
            if (query.data_fim) params.append('data_fim', query.data_fim);
            if (query.vendedor_id) params.append('vendedor_id', String(query.vendedor_id));
            if (query.q) params.append('q', query.q);
            if (force) params.append('force', 'true');

            const res = await api<PagedPedidosVenda>(`/financeiro/pedidos?${params.toString()}`);
            setPedidos(res.items || []);
            setKpis(res.kpis || DEFAULT_KPIS);
            setTotal(res.total || 0);
            setTotalPages(res.totalPages || 1);
        } catch (err: any) {
            console.error('Erro ao carregar pedidos:', err);
            setError(err.message || 'Falha ao buscar pedidos no TagPlus.');
        } finally {
            setLoading(false);
        }
    }, [filtros]);

    useEffect(() => {
        void carregarPedidos();
    }, [carregarPedidos]);

    const atualizarFiltros = (parciais: Partial<FiltrosPedidosVenda>) => {
        setFiltros((prev) => ({
            ...prev,
            ...parciais,
            page: parciais.page ?? 1,
        }));
    };

    return {
        pedidos,
        kpis,
        total,
        totalPages,
        loading,
        error,
        filtros,
        atualizarFiltros,
        recarregar: () => carregarPedidos(undefined, true),
    };
}

