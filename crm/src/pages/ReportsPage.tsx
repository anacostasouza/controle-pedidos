import { useEffect, useState } from 'react';
import { all, money } from '../services/crmApi';
import type { Bootstrap, Row } from '../services/crmApi';
import { Field } from '../components';

export function ReportsPage({ boot }: { boot: Bootstrap }) {
    const [rows, setRows] = useState<Row[]>([]);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [ownerId, setOwnerId] = useState('');
    const [state, setState] = useState('');
    const [stage, setStage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        all<Row>('/opportunities?state=').then(setRows).catch(cause => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o relatório.')).finally(() => setLoading(false));
    }, []);

    const filtered = rows.filter(row => (!from || row.createdAt.slice(0, 10) >= from) && (!to || row.createdAt.slice(0, 10) <= to) && (!ownerId || row.ownerId === ownerId) && (!state || row.state === state) && (!stage || row.stage === stage));
    const totalValue = filtered.reduce((sum, row) => sum + (row.valueCents || 0), 0);
    const wonValue = filtered.filter(row => row.outcome === 'Conquistado').reduce((sum, row) => sum + (row.valueCents || 0), 0);

    function exportCsv() {
        const header = ['Cliente', 'Empresa', 'Responsável', 'Etapa', 'Situação', 'Valor', 'Data de criação'];
        const body = filtered.map(row => [row.client?.name || '', row.company?.name || '', boot.users.find(user => user.id === row.ownerId)?.name || 'Sem responsável', row.stage, row.state, String((row.valueCents || 0) / 100), row.createdAt.slice(0, 10)]);
        const csv = [header, ...body].map(line => line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
        link.download = 'relatorio-crm.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    }

    return <section className="page"><div className="page-heading"><div><p className="eyebrow">GESTÃO COMERCIAL</p><h1>Relatórios da carteira.</h1><p>Analise oportunidades, valores e resultados em um recorte controlado.</p></div><button className="primary" onClick={exportCsv} disabled={loading || !filtered.length}>Baixar CSV</button></div><section className="panel padded report-filters"><Field label="Criada desde"><input type="date" value={from} onChange={event => setFrom(event.target.value)} /></Field><Field label="Até"><input type="date" value={to} onChange={event => setTo(event.target.value)} /></Field><Field label="Responsável"><select value={ownerId} onChange={event => setOwnerId(event.target.value)}><option value="">Todos</option>{boot.users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field><Field label="Situação"><select value={state} onChange={event => setState(event.target.value)}><option value="">Todas</option><option value="active">Ativas</option><option value="archived">Arquivadas</option><option value="closed">Concluídas</option></select></Field><Field label="Etapa"><select value={stage} onChange={event => setStage(event.target.value)}><option value="">Todas</option>{['Lead qualificado', 'Elaboração de proposta', 'Proposta enviada', 'Em negociação', 'Conclusão'].map(value => <option key={value}>{value}</option>)}</select></Field></section>{error && <p className="error">{error}</p>}{loading ? <p className="loading">Carregando relatório…</p> : <><div className="metric-grid report-metrics"><article className="metric"><span>OPORTUNIDADES</span><strong>{filtered.length}</strong><small>Registros no recorte</small></article><article className="metric"><span>VALOR DA CARTEIRA</span><strong>{money(totalValue)}</strong><small>Valor total considerado</small></article><article className="metric"><span>CONQUISTADO</span><strong>{money(wonValue)}</strong><small>Oportunidades ganhas</small></article></div><section className="panel table-scroll"><table><thead><tr><th>Cliente</th><th>Empresa</th><th>Responsável</th><th>Etapa</th><th>Situação</th><th>Valor</th></tr></thead><tbody>{filtered.map(row => <tr key={row.id}><td>{row.client?.name || '—'}</td><td>{row.company?.name || '—'}</td><td>{boot.users.find(user => user.id === row.ownerId)?.name || 'Sem responsável'}</td><td>{row.stage}</td><td>{row.state}</td><td>{money(row.valueCents)}</td></tr>)}</tbody></table></section></>}</section>;
}
