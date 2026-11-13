import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { FiltrosLancamento, PagedLancamentos } from '../contracts';

interface UseLancamentosResult {
    dados: PagedLancamentos | null;
    loading: boolean;
    error: string;
    refetch: () => void;
}

function buildQuery(filtros: FiltrosLancamento): string {
    const params = new URLSearchParams();
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.status) params.set('status', filtros.status);
    if (filtros.data_vencimento_inicial)
        params.set('data_vencimento_inicial', filtros.data_vencimento_inicial);
    if (filtros.data_vencimento_final)
        params.set('data_vencimento_final', filtros.data_vencimento_final);
    if (filtros.q) params.set('q', filtros.q);
    if (filtros.page != null) params.set('page', String(filtros.page));
    if (filtros.limit != null) params.set('limit', String(filtros.limit));
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

export function useDebouncedValue<T>(value: T, delayMs = 350): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}

export function useLancamentos(filtros: FiltrosLancamento): UseLancamentosResult {
    const [dados, setDados] = useState<PagedLancamentos | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const countRef = useRef(0);

    const fetch_ = useCallback(async () => {
        const generation = ++countRef.current;
        setLoading(true);
        setError('');
        try {
            const result = await api<PagedLancamentos>(
                `/financeiro/lancamentos${buildQuery(filtros)}`
            );
            if (generation === countRef.current) {
                setDados(result);
            }
        } catch (cause) {
            if (generation === countRef.current) {
                setError(cause instanceof Error ? cause.message : 'Falha ao carregar lançamentos.');
            }
        } finally {
            if (generation === countRef.current) {
                setLoading(false);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(filtros)]);

    useEffect(() => {
        void fetch_();
        const interval = setInterval(() => {
            if (!document.hidden) {
                void fetch_();
            }
        }, 180_000);
        return () => clearInterval(interval);
    }, [fetch_]);

    return { dados, loading, error, refetch: () => void fetch_() };
}
