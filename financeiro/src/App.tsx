import { useState } from 'react';
import { useFinanceiroSession } from './hooks/useFinanceiroSession';
import { LoginScreen, createGoogleLogin } from './components/auth/LoginScreen';
import { FinanceiroShell } from './components/layout/FinanceiroShell';
import { DashboardPage } from './pages/DashboardPage';
import { ContasReceberPage } from './pages/ContasReceberPage';
import { ContasPagarPage } from './pages/ContasPagarPage';
import { configured } from './api';

type Page = 'dashboard' | 'receber' | 'pagar';

export default function App() {
    const { user, loading } = useFinanceiroSession();
    const [page, setPage] = useState<Page>('dashboard');
    const [logging, setLogging] = useState(false);
    const [loginError, setLoginError] = useState('');

    async function login() {
        setLogging(true);
        setLoginError('');
        try {
            await createGoogleLogin()();
        } catch {
            setLoginError('Não foi possível entrar. Verifique a conta Google e tente novamente.');
        } finally {
            setLogging(false);
        }
    }

    if (!configured || !user) {
        return (
            <LoginScreen
                loading={loading}
                logging={logging}
                error={loginError}
                onLogin={login}
            />
        );
    }

    return (
        <FinanceiroShell
            user={user}
            page={page}
            onPageChange={setPage}
        >
            {page === 'dashboard' ? (
                <DashboardPage />
            ) : page === 'receber' ? (
                <ContasReceberPage />
            ) : (
                <ContasPagarPage />
            )}
        </FinanceiroShell>
    );
}
