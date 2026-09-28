import { signOut } from 'firebase/auth';
import { auth, roleLabels } from '../../services/crmApi';
import type { Bootstrap } from '../../services/crmApi';
import { getCrmNavigation } from '../../navigation';

type CrmShellProps = {
    boot: Bootstrap;
    page: string;
    onPageChange: (page: string) => void;
    children: React.ReactNode;
};

export function CrmShell({ boot, page, onPageChange, children }: CrmShellProps) {
    const navigation = getCrmNavigation(boot.actor.role);

    return <div className="app-shell"><aside className="sidebar"><div className="brand">desenhar<span>CRM</span></div><div className="nav-caption">COMERCIAL</div><nav aria-label="Navegação principal">{navigation.map(item => <button key={item.label} className={page === item.label ? 'selected' : ''} onClick={() => onPageChange(item.label)}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav><div className="sidebar-bottom"><div className="avatar">{boot.actor.name.slice(0, 1)}</div><strong>{boot.actor.name}</strong><small>{roleLabels[boot.actor.role]}</small><button onClick={() => void signOut(auth)}>Sair da conta ↗</button></div></aside><main className="main"><header className="topbar"><span>Desenhar <b>/</b> Comercial <b>/</b> {page}</span><span className="live-dot">Carteira compartilhada</span><button className="mobile-logout" onClick={() => void signOut(auth)}>Sair</button></header>{children}</main></div>;
}
