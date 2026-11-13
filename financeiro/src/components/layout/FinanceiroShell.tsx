import { useState } from 'react';
import { signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { api, auth, displayDate } from '../../api';
import {
    IconDashboard,
    IconReceber,
    IconPagar,
    IconShoppingCart,
    IconLogout,
    IconRefresh,
} from '../icons/Icons';

export type Page = 'dashboard' | 'pedidos' | 'receber' | 'pagar';

type FinanceiroShellProps = {
    user: User;
    page: Page;
    onPageChange: (page: Page) => void;
    syncedAt?: string | null;
    children: React.ReactNode;
};

type NavGroup = {
    caption: string;
    items: { label: string; page: Page; icon: (selected: boolean) => React.ReactNode }[];
};

const NAV_GROUPS: NavGroup[] = [
    {
        caption: 'FINANCEIRO',
        items: [
            { label: 'Dashboard', page: 'dashboard', icon: () => <IconDashboard size={18} /> },
            { label: 'Contas a Receber', page: 'receber', icon: () => <IconReceber size={18} /> },
            { label: 'Contas a Pagar', page: 'pagar', icon: () => <IconPagar size={18} /> },
        ],
    },
    {
        caption: 'COMERCIAL / VENDAS',
        items: [
            { label: 'Vendas Simples', page: 'pedidos', icon: () => <IconShoppingCart size={18} /> },
        ],
    },
];

const PAGE_LABELS: Record<Page, string> = {
    dashboard: 'Dashboard',
    pedidos: 'Vendas Simples (TagPlus)',
    receber: 'Contas a Receber',
    pagar: 'Contas a Pagar',
};

export function FinanceiroShell({
    user,
    page,
    onPageChange,
    syncedAt,
    children,
}: FinanceiroShellProps) {
    const [syncing, setSyncing] = useState(false);
    const initial = user.displayName?.slice(0, 1) ?? user.email?.slice(0, 1) ?? 'U';

    const handleSync = async () => {
        if (syncing) return;
        try {
            setSyncing(true);
            await api('/financeiro/sync', 'POST', { force: true });
            // Dá tempo para o primeiro lote gravar no Firestore e recarrega
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        } catch (e) {
            alert('Erro ao disparar sincronização: ' + (e instanceof Error ? e.message : String(e)));
            setSyncing(false);
        }
    };

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand">
                    desenhar<span>ERP</span>
                </div>
                <nav aria-label="Navegação principal">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.caption} style={{ marginBottom: '14px' }}>
                            <div className="nav-caption">{group.caption}</div>
                            {group.items.map((item) => (
                                <button
                                    key={item.page}
                                    className={page === item.page ? 'selected' : ''}
                                    onClick={() => onPageChange(item.page)}
                                >
                                    <span className="nav-icon" aria-hidden="true">
                                        {item.icon(page === item.page)}
                                    </span>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>
                <div className="sidebar-bottom">
                    <div className="avatar">{initial.toUpperCase()}</div>
                    <strong>{user.displayName ?? user.email}</strong>
                    <small>{user.email}</small>
                    {syncedAt && (
                        <small>Sync: {displayDate(syncedAt.slice(0, 10))}</small>
                    )}
                    <button onClick={() => void signOut(auth)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <IconLogout size={14} /> Sair da conta
                    </button>
                </div>
            </aside>
            <main className="main">
                <header className="topbar">
                    <span>
                        Desenhar <b>/</b> Financeiro <b>/</b> {PAGE_LABELS[page]}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={() => void handleSync()}
                            disabled={syncing}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 500,
                                borderRadius: '6px',
                                border: '1px solid #d1d5db',
                                background: syncing ? '#f3f4f6' : '#ffffff',
                                cursor: syncing ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#1f2937',
                                transition: 'all 0.2s ease',
                            }}
                            title="Buscar lançamentos recentes na TagPlus"
                        >
                            <IconRefresh size={14} />
                            {syncing ? 'Sincronizando...' : 'Atualizar TagPlus'}
                        </button>
                        <span className="live-dot">Dados sincronizados</span>
                    </div>
                    <button
                        className="mobile-logout"
                        onClick={() => void signOut(auth)}
                    >
                        Sair
                    </button>
                </header>
                {children}
            </main>
        </div>
    );
}
