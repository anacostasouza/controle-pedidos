import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { ResumoFinanceiro } from '../contracts';

export interface UseResumoParams {
    de?: string;
    ate?: string;
    dias?: number;
}

export function useResumo(initialParams?: UseResumoParams) {
    const [params, setParams] = useState<UseResumoParams | undefined>(initialParams);
    const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetch_ = useCallback(async (customParams?: UseResumoParams) => {
        setLoading(true);
        setError('');
        try {
            const activeParams = customParams !== undefined ? customParams : params;
            const q = new URLSearchParams();
            if (activeParams?.de) q.set('de', activeParams.de);
            if (activeParams?.ate) q.set('ate', activeParams.ate);
            if (activeParams?.dias) q.set('dias', String(activeParams.dias));

            const queryStr = q.toString() ? `?${q.toString()}` : '';
            const data = await api<ResumoFinanceiro>(`/financeiro/resumo${queryStr}`);
            setResumo(data);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Falha ao carregar resumo financeiro.');
        } finally {
            setLoading(false);
        }
    }, [params]);

    useEffect(() => {
        void fetch_();
    }, [fetch_]);

    return { resumo, loading, error, refetch: fetch_, setParams };
}

