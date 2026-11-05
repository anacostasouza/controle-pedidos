import { useEffect, useState } from 'react';
import { all, money } from '../services/crmApi';
import type { Bootstrap, Row } from '../services/crmApi';
import { Field } from '../components';

type SortKey = 'client' | 'company' | 'owner' | 'stage' | 'state' | 'value' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const stateLabels: Record<string, string> = {
    active: 'Aberta',
    archived: 'Em espera',
    closed: 'Concluída',
};

function localDate(value: Date) {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function presetRange(preset: string): [string, string] {
    const end = new Date();
    const start = new Date(end);
    if (preset === 'week') {
        const day = start.getDay() || 7;
        start.setDate(start.getDate() - day + 1);
    } else if (preset === 'fortnight') {
        start.setDate(start.getDate() <= 15 ? 1 : 16);
    } else if (preset === 'month') {
        start.setDate(1);
    } else {
        return ['', ''];
    }
    return [localDate(start), localDate(end)];
}

function percentage(value: number, total: number) {
    return total ? `${Math.round((value / total) * 100)}%` : '0%';
}

export function ReportsPage({ boot }: { boot: Bootstrap }) {
    const [rows, setRows] = useState<Row[]>([]);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [ownerId, setOwnerId] = useState('');
    const [state, setState] = useState('');
    const [stage, setStage] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        all<Row>('/opportunities?state=')
            .then(setRows)
            .catch(cause => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o relatório.'))
            .finally(() => setLoading(false));
    }, []);

    const filtered = rows.filter(row =>
        (!from || row.createdAt.slice(0, 10) >= from) &&
        (!to || row.createdAt.slice(0, 10) <= to) &&
        (!ownerId || row.ownerId === ownerId) &&
        (!state || row.state === state) &&
        (!stage || row.stage === stage),
    );
    const totalCount = filtered.length;
    const totalValue = filtered.reduce((sum, row) => sum + (row.valueCents || 0), 0);
    const won = filtered.filter(row => row.outcome === 'Conquistado');
    const lost = filtered.filter(row => row.outcome === 'Perdido');
    const open = filtered.filter(row => row.state !== 'closed');
    const wonValue = won.reduce((sum, row) => sum + (row.valueCents || 0), 0);
    const lostValue = lost.reduce((sum, row) => sum + (row.valueCents || 0), 0);
    const openValue = open.reduce((sum, row) => sum + (row.valueCents || 0), 0);
    const ownerName = (row: Row) => boot.users.find(user => user.id === row.ownerId)?.name || 'Sem responsável';
    const valueForSort = (row: Row): string | number => ({
        client: row.client?.name || '',
        company: row.company?.name || '',
        owner: ownerName(row),
        stage: row.stage,
        state: stateLabels[row.state] || row.state,
        value: row.valueCents || 0,
        createdAt: row.createdAt,
    })[sortKey];
    const sorted = [...filtered].sort((left, right) => {
        const a = valueForSort(left);
        const b = valueForSort(right);
        const result = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'pt-BR');
        return sortDirection === 'asc' ? result : -result;
    });

    function changeSort(key: SortKey) {
        if (sortKey === key) setSortDirection(current => current === 'asc' ? 'desc' : 'asc');
        else {
            setSortKey(key);
            setSortDirection('asc');
        }
    }

    function applyPreset(preset: string) {
        const [nextFrom, nextTo] = presetRange(preset);
        setFrom(nextFrom);
        setTo(nextTo);
    }

    function exportCsv() {
        const header = ['Cliente', 'Empresa', 'Responsável', 'Etapa', 'Situação', 'Valor', 'Data de criação'];
        const body = sorted.map(row => [row.client?.name || '', row.company?.name || '', ownerName(row), row.stage, stateLabels[row.state] || row.state, String((row.valueCents || 0) / 100), row.createdAt.slice(0, 10)]);
        const csv = [header, ...body].map(line => line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
        link.download = 'relatorio-crm.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    }

    const heading = (key: SortKey, label: string) => <button className="table-sort" onClick={() => changeSort(key)}>{label}{sortKey === key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</button>;

    return <section className="page">
        <div className="page-heading"><div><p className="eyebrow">GESTÃO COMERCIAL</p><h1>Relatórios da carteira.</h1><p>Analise oportunidades, valores e resultados em um recorte controlado.</p></div><button className="primary" onClick={exportCsv} disabled={loading || !sorted.length}>Baixar CSV</button></div>
        <section className="panel padded report-filters">
            <Field label="Período"><select defaultValue="" onChange={event => applyPreset(event.target.value)}><option value="">Personalizado</option><option value="week">Semana atual</option><option value="fortnight">Quinzena atual</option><option value="month">Mês atual</option></select></Field>
            <Field label="Criada desde"><input type="date" value={from} onChange={event => setFrom(event.target.value)} /></Field><Field label="Até"><input type="date" value={to} onChange={event => setTo(event.target.value)} /></Field>
            <Field label="Responsável"><select value={ownerId} onChange={event => setOwnerId(event.target.value)}><option value="">Todos</option>{boot.users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field>
            <Field label="Situação"><select value={state} onChange={event => setState(event.target.value)}><option value="">Todas</option><option value="active">Abertas</option><option value="archived">Em espera</option><option value="closed">Concluídas</option></select></Field>
            <Field label="Etapa"><select value={stage} onChange={event => setStage(event.target.value)}><option value="">Todas</option>{['Lead qualificado', 'Elaboração de proposta', 'Proposta enviada', 'Em negociação', 'Conclusão'].map(value => <option key={value}>{value}</option>)}</select></Field>
        </section>
        {error && <p className="error">{error}</p>}
        {loading ? <p className="loading">Carregando relatório…</p> : <>
            <div className="metric-grid report-metrics">
                <article className="metric"><span>OPORTUNIDADES</span><strong>{totalCount}</strong><small>{money(totalValue)} no recorte</small></article>
                <article className="metric"><span>CONVERSÃO</span><strong>{money(wonValue)}</strong><small className="metric-percentage"><span>{percentage(wonValue, totalValue)} do valor total</span><span className="metric-info" tabIndex={0} role="img" aria-label="Como o percentual é calculado">!</span><span className="metric-tooltip" role="tooltip">Percentual calculado pelo valor conquistado dividido pelo valor total do recorte.</span></small><small>{won.length} conquistadas</small></article>
                <article className="metric"><span>PERDAS</span><strong>{money(lostValue)}</strong><small className="metric-percentage"><span>{percentage(lostValue, totalValue)} do valor total</span><span className="metric-info" tabIndex={0} role="img" aria-label="Como o percentual é calculado">!</span><span className="metric-tooltip" role="tooltip">Percentual calculado pelo valor perdido dividido pelo valor total do recorte.</span></small><small>{lost.length} perdidas</small></article>
                <article className="metric"><span>AINDA ABERTAS</span><strong>{money(openValue)}</strong><small className="metric-percentage"><span>{percentage(openValue, totalValue)} do valor total</span><span className="metric-info" tabIndex={0} role="img" aria-label="Como o percentual é calculado">!</span><span className="metric-tooltip" role="tooltip">Percentual calculado pelo valor em aberto dividido pelo valor total do recorte.</span></small><small>{open.length} oportunidades</small></article>
            </div>
            <section className="panel table-scroll"><table className="report-table"><thead><tr><th>{heading('client', 'Cliente')}</th><th>{heading('company', 'Empresa')}</th><th>{heading('owner', 'Responsável')}</th><th>{heading('stage', 'Etapa')}</th><th>{heading('state', 'Situação')}</th><th>{heading('value', 'Valor')}</th><th>{heading('createdAt', 'Criada em')}</th></tr></thead><tbody>{sorted.map(row => <tr key={row.id}><td>{row.client?.name || '—'}</td><td>{row.company?.name || '—'}</td><td>{ownerName(row)}</td><td>{row.stage}</td><td>{stateLabels[row.state] || row.state}</td><td>{money(row.valueCents)}</td><td>{row.createdAt.slice(0, 10).split('-').reverse().join('/')}</td></tr>)}</tbody></table></section>
        </>}
    </section>;
}
