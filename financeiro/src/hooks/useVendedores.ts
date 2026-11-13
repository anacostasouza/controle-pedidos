import { useState, useEffect } from 'react';
import { api } from '../api';
import type { VendedorTagPlus } from '../contracts';

export function useVendedores() {
    const [vendedores, setVendedores] = useState<VendedorTagPlus[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        async function fetchVendedores() {
            setLoading(true);
            try {
                const res = await api<{ items: VendedorTagPlus[] }>('/financeiro/vendedores');
                if (mounted && Array.isArray(res.items)) {
                    setVendedores(res.items);
                }
            } catch (err) {
                console.warn('Erro ao carregar lista de vendedores:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        void fetchVendedores();
        return () => {
            mounted = false;
        };
    }, []);

    return { vendedores, loading };
}

