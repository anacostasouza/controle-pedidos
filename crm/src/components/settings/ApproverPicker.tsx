import { useMemo, useState } from 'react';
import type { User } from '../../services/crmApi';

type ApproverPickerProps = {
    users: User[];
    defaultValue: string[];
};

export function ApproverPicker({ users, defaultValue }: ApproverPickerProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState(() => new Set(defaultValue));
    const activeUsers = users.filter(user => user.active);
    const visible = useMemo(() => activeUsers.filter(user => user.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [activeUsers, query]);
    const selectedNames = activeUsers.filter(user => selectedIds.has(user.id)).map(user => user.name);
    const summary = selectedNames.length ? `${selectedNames.length} selecionado${selectedNames.length > 1 ? 's' : ''}` : 'Nenhum validador selecionado';

    return <div className="approver-picker"><button type="button" className="approver-trigger" aria-expanded={open} onClick={() => setOpen(value => !value)}><span>{summary}</span><span aria-hidden="true">⌄</span></button>{open && <div className="approver-menu"><input aria-label="Buscar validador" placeholder="Buscar usuário…" value={query} onChange={event => setQuery(event.target.value)} />{selectedNames.length > 0 && <small>{selectedNames.join(', ')}</small>}<div className="approver-options">{visible.map(user => <label key={user.id} className="approver-option"><input type="checkbox" name="approvers" value={user.id} checked={selectedIds.has(user.id)} onChange={event => setSelectedIds(current => { const next = new Set(current); if (event.target.checked) next.add(user.id); else next.delete(user.id); return next; })} /><span><strong>{user.name}</strong><small>{user.sector || 'Setor não informado'}</small></span></label>)}{visible.length === 0 && <small>Nenhum usuário encontrado.</small>}</div><button type="button" className="approver-done" onClick={() => setOpen(false)}>Concluir seleção</button></div>}</div>;
}
