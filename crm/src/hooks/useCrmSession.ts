import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { api, auth } from '../services/crmApi';
import type { Bootstrap } from '../services/crmApi';

export function useCrmSession() {
    const [boot, setBoot] = useState<Bootstrap | null>(null);
    const [loading, setLoading] = useState(true);
    const [signed, setSigned] = useState(false);
    const [error, setError] = useState('');

    async function refresh() {
        setLoading(true);
        setError('');
        try {
            setBoot(await api<Bootstrap>('/bootstrap'));
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Falha de acesso.');
            throw cause;
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let generation = 0;
        const unsubscribe = onAuthStateChanged(auth, async user => {
            const current = ++generation;
            setSigned(!!user);
            setBoot(null);
            setError('');
            setLoading(true);
            if (user) {
                try {
                    const nextBoot = await api<Bootstrap>('/bootstrap');
                    if (current === generation) {
                        setBoot(nextBoot);
                    }
                } catch (cause) {
                    if (current === generation) {
                        setError(cause instanceof Error ? cause.message : 'Falha de acesso.');
                    }
                }
            }
            if (current === generation) {
                setLoading(false);
            }
        });
        return () => {
            generation++;
            unsubscribe();
        };
    }, []);

    return {
        boot,
        loading,
        signed,
        error,
        refresh,
        signOut: () => signOut(auth),
    };
}
