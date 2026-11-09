import { useMemo, useState } from 'react';
import { useLancamentos } from '../hooks/useLancamentos';
import { money, displayDate } from '../api';
import type { FiltrosLancamento, StatusLancamento } from '../contracts';
import { IconRefresh, IconChevronLeft, IconChevronRight } from '../components/icons/Icons';

function StatusBadge({ status }: { status: StatusLancamento }) {
    const cls =
        status === 'aberto'
            ? 'badge badge-aberto'
            : status === 'liquidado'
              ? 'badge badge-liquidado'
              : status === 'vencido'
                ? 'badge badge-vencido'
                : 'badge badge-cancelado';
    const label =
        status === 'aberto'
            ? 'Aberto'
            : status === 'liquidado'
              ? 'Liquidado'
              : status === 'vencido'
                ? 'Vencido'
                : 'Cancelado';
    return <span className={cls}>{label}</span>;
}

export function ContasReceberPage() {
    const [status, setStatus] = useState<StatusLancamento | ''>('');
    const [dataInicial, setDataInicial] = useState('');
    const [dataFinal, setDataFinal] = useState('');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);

    const filtros: FiltrosLancamento = {
        tipo: 'C',
        ...(status ? { status } : {}),
        ...(dataInicial ? { data_vencimento_inicial: dataInicial } : {}),
        ...(dataFinal ? { data_vencimento_final: dataFinal } : {}),
        ...(q ? { q } : {}),
        page,
        limit: 25,
    };

    const { dados, loading, error, refetch } = useLancamentos(filtros);

    const hasFilters = Boolean(status || dataInicial || dataFinal || q);

    const { totalValor, totalPendente } = useMemo(() => {
        const items = dados?.items ?? [];
        let totalValor = 0;
        let totalPendente = 0;
        for (const item of items) {
            totalValor += item.valor || 0;
            totalPendente += Math.max(0, (item.valor || 0) - (item.valor_pago || 0));
        }
        return { totalValor, totalPendente };
    }, [dados?.items]);

    function handleFilterChange() {
        setPage(1);
    }

    function clearFilters() {
        setStatus('');
        setDataInicial('');
        setDataFinal('');
        setQ('');
        setPage(1);
    }

    return (
        <div className="page">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">CONTAS A RECEBER</p>
                    <h1>Recebimentos</h1>
                    <p>Lançamentos de crédito — {dados ? `${dados.total} registros no total` : '…'}</p>
                </div>
                <button onClick={refetch} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <IconRefresh size={15} /> Atualizar agora
                </button>
            </div>

            {/* Filtros */}
            <div className="filtros">
                <div className="field">
                    <label>Status</label>
                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value as StatusLancamento | '');
                            handleFilterChange();
                        }}
                    >
                        <option value="">Todos</option>
                        <option value="aberto">Aberto</option>
                        <option value="liquidado">Liquidado</option>
                        <option value="vencido">Vencido</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                </div>
                <div className="field">
                    <label>Vencimento de</label>
                    <input
                        type="date"
                        value={dataInicial}
                        onChange={(e) => {
                            setDataInicial(e.target.value);
                            handleFilterChange();
                        }}
                    />
                </div>
                <div className="field">
                    <label>Vencimento até</label>
                    <input
                        type="date"
                        value={dataFinal}
                        onChange={(e) => {
                            setDataFinal(e.target.value);
                            handleFilterChange();
                        }}
                    />
                </div>
                <div className="field" style={{ flex: 2, minWidth: '180px' }}>
                    <label>Buscar</label>
                    <input
                        type="search"
                        placeholder="Descrição, cliente…"
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            handleFilterChange();
                        }}
                    />
                </div>
                {hasFilters && (
                    <div className="field" style={{ flex: 'none' }}>
                        <button
                            type="button"
                            onClick={clearFilters}
                            style={{
                                padding: '10px 14px',
                                fontSize: '12px',
                                background: '#f3f4f6',
                                color: '#4b5563',
                                border: '1px solid #d1d5db'
                            }}
                        >
                            Limpar filtros
                        </button>
                    </div>
                )}
            </div>

            {error && <p className="error">{error}</p>}

            <div className="panel">
                {/* Barra de resumo da página e total geral */}
                {dados && dados.items.length > 0 && (
                    <div className="table-summary-bar">
                        <span>
                            Exibindo <strong>{dados.items.length}</strong> de <strong>{dados.total}</strong> lançamentos
                        </span>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {dados.totalValorGeral !== undefined && (
                                <>
                                    <span>
                                        Total Geral: <strong>{money(dados.totalValorGeral)}</strong>
                                    </span>
                                    <span>
                                        Saldo Geral Pendente: <strong style={{ color: (dados.totalPendenteGeral ?? 0) > 0 ? '#b91c1c' : '#15803d' }}>{money(dados.totalPendenteGeral)}</strong>
                                    </span>
                                    <span style={{ color: '#cbd5e1', userSelect: 'none' }}>|</span>
                                </>
                            )}
                            <span>
                                Total na página: <strong>{money(totalValor)}</strong>
                            </span>
                            <span>
                                Pendente na página: <strong style={{ color: totalPendente > 0 ? '#b91c1c' : '#15803d' }}>{money(totalPendente)}</strong>
                            </span>
                        </div>
                    </div>
                )}

                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th className="col-desc">Descrição</th>
                                <th className="col-entity">Cliente</th>
                                <th className="col-date">Vencimento</th>
                                <th className="col-val">Valor</th>
                                <th className="col-val-secondary">Valor Pago</th>
                                <th className="col-status">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !dados && (
                                <tr>
                                    <td colSpan={6} className="loading" style={{ textAlign: 'center', padding: '30px' }}>
                                        Carregando lançamentos…
                                    </td>
                                </tr>
                            )}
                            {!loading && dados?.items.length === 0 && (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty" style={{ padding: '36px', textAlign: 'center' }}>
                                            <p style={{ color: '#6b7280', margin: 0 }}>Nenhum lançamento encontrado para os filtros selecionados.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {dados?.items.map((l) => (
                                <tr key={l.id}>
                                    <td className="col-desc">
                                        <strong>{l.descricao}</strong>
                                        {l.observacoes && <small>{l.observacoes}</small>}
                                    </td>
                                    <td className="col-entity">{l.entidade_nome ?? '—'}</td>
                                    <td className="col-date">{displayDate(l.data_vencimento)}</td>
                                    <td className="col-val">{money(l.valor)}</td>
                                    <td className="col-val-secondary">{money(l.valor_pago)}</td>
                                    <td className="col-status">
                                        <StatusBadge status={l.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                {dados && dados.totalPages > 1 && (
                    <div className="pagination" style={{ padding: '16px 20px', borderTop: '1px solid #edf2ef' }}>
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <IconChevronLeft size={14} /> Anterior
                        </button>
                        <span>
                            Página {dados.page} de {dados.totalPages}
                        </span>
                        <button
                            disabled={page >= dados.totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                            Próxima <IconChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
