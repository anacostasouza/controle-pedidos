import type { Bootstrap } from '../../services/crmApi';
import { Field } from '../../components';

type WorkspaceToolbarProps = {
    boot: Bootstrap;
    page: string;
    owner: string;
    query: string;
    loading: boolean;
    onOwnerChange: (value: string) => void;
    onQueryChange: (value: string) => void;
    onRefresh: () => void;
};

export function WorkspaceToolbar({ boot, page, owner, query, loading, onOwnerChange, onQueryChange, onRefresh }: WorkspaceToolbarProps) {
    return <div className="toolbar"><Field label="Carteira do vendedor"><select value={owner} onChange={event => onOwnerChange(event.target.value)}>{page !== 'Meu Dia' && <><option value="">Todos os vendedores</option><option value="unassigned">Aguardando distribuição</option></>}{boot.users.map(user => <option key={user.id} value={user.id}>{user.name}{!user.active ? ' (inativo)' : ''}</option>)}</select></Field><Field label="Buscar cliente ou empresa"><input placeholder="Nome, empresa ou contato…" value={query} onChange={event => onQueryChange(event.target.value)} /></Field><button onClick={onRefresh} disabled={loading}>↻ Atualizar</button></div>;
}
