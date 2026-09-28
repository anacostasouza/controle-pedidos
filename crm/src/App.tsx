import { useState } from 'react';
import { configured } from './services/crmApi';
import { Workspace } from './pages/WorkspacePage';
import { Catalogs } from './pages/CatalogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { CrmShell } from './components/layout/CrmShell';
import { LoginScreen, createGoogleLogin } from './components/auth/LoginScreen';
import { useCrmSession } from './hooks/useCrmSession';
export default function App() {
    const { boot, loading, signed, error, refresh, signOut } = useCrmSession();
    const [page, setPage] = useState('Meu Dia'), [logging, setLogging] = useState(false), [loginError, setLoginError] = useState('');
    async function login() { setLogging(true); setLoginError(''); try {
        await createGoogleLogin()();
    } catch {
        setLoginError('Não foi possível entrar. Verifique a conta Google e tente novamente.');
    }
    finally {
        setLogging(false);
    } }
    if (!boot)
        return <LoginScreen configured={configured} signed={signed} loading={loading} logging={logging} error={loginError || error} onLogin={login} onRetry={refresh} onSwitchAccount={signOut} />;
    return <CrmShell boot={boot} page={page} onPageChange={setPage}>{page === 'Meu Dia' || page === 'Oportunidades' ? <Workspace key="workspace" boot={boot} page={page}/> : page === 'Configurações' ? <SettingsPage boot={boot} reload={refresh}/> : page === 'Relatórios' ? <ReportsPage boot={boot}/> : <Catalogs key={page} kind={page === 'Clientes' ? 'clients' : 'companies'} boot={boot}/>}</CrmShell>;
}
