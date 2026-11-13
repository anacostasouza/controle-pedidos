import { useState } from 'react';
import { useResumo } from '../hooks/useResumo';
import { money, displayDate } from '../api';
import { IconReceber, IconPagar, IconAlert, IconCalendar, IconRefresh, IconScale } from '../components/icons/Icons';

export function DashboardPage() {
    const { resumo, loading, error, refetch } = useResumo();
    const [horizonte, setHorizonte] = useState<'7' | '15' | '30' | 'livre'>('7');
    const [customDe, setCustomDe] = useState('');
    const [customAte, setCustomAte] = useState('');

    if (loading && !resumo) {
        return (
            <div className="page">
                <p className="loading">Carregando dados financeiros…</p>
            </div>
        );
    }

    if (error && !resumo) {
        return (
            <div className="page">
                <p className="error">{error}</p>
                <button
                    onClick={() => void refetch()}
                    style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #005a36',
                        background: '#005a36',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <IconRefresh size={14} /> Tentar novamente
                </button>
            </div>
        );
    }

    const receber = resumo?.receber ?? { emAberto: 0, vencido: 0, aVencer7: 0, totalRegistros: 0 };
    const pagar = resumo?.pagar ?? { emAberto: 0, vencido: 0, aVencer7: 0, totalRegistros: 0 };
    const isEmpty = (resumo?.totalGeral ?? 0) === 0;

    // Datas do período de referência
    const dataBaseStr = resumo?.periodo?.dataBase || new Date().toISOString().slice(0, 10);
    const dataBaseFmt = displayDate(dataBaseStr);

    const vencidosAteStr = resumo?.periodo?.vencidosAte || '';
    const vencidosAteFmt = displayDate(vencidosAteStr);

    // Valores projetados conforme o horizonte selecionado
    let projReceber = 0;
    let projPagar = 0;
    let projSaldoLiquido = 0;
    let projCobertura: number | null = null;
    let dataFimProjecaoStr = '';
    let horizonLabel = `${horizonte} Dias`;

    if (horizonte === '15') {
        horizonLabel = '15 Dias';
        if (resumo?.horizontes?.d15) {
            projReceber = resumo.horizontes.d15.receber;
            projPagar = resumo.horizontes.d15.pagar;
            projSaldoLiquido = resumo.horizontes.d15.saldoLiquido;
            projCobertura = resumo.horizontes.d15.indiceCobertura;
            dataFimProjecaoStr = resumo.horizontes.d15.dataFim;
        } else if (resumo?.periodo?.diasProjecao === 15) {
            projReceber = receber.projetado ?? 0;
            projPagar = pagar.projetado ?? 0;
            projSaldoLiquido = resumo?.saldoLiquido?.projetado ?? (projReceber - projPagar);
            projCobertura = resumo?.saldoLiquido?.indiceCoberturaProjetada ?? (projPagar > 0 ? Number(((projReceber / projPagar) * 100).toFixed(1)) : null);
            dataFimProjecaoStr = resumo?.periodo?.dataFimProjecao || '';
        }
    } else if (horizonte === '30') {
        horizonLabel = '30 Dias';
        if (resumo?.horizontes?.d30) {
            projReceber = resumo.horizontes.d30.receber;
            projPagar = resumo.horizontes.d30.pagar;
            projSaldoLiquido = resumo.horizontes.d30.saldoLiquido;
            projCobertura = resumo.horizontes.d30.indiceCobertura;
            dataFimProjecaoStr = resumo.horizontes.d30.dataFim;
        } else if (resumo?.periodo?.diasProjecao === 30) {
            projReceber = receber.projetado ?? 0;
            projPagar = pagar.projetado ?? 0;
            projSaldoLiquido = resumo?.saldoLiquido?.projetado ?? (projReceber - projPagar);
            projCobertura = resumo?.saldoLiquido?.indiceCoberturaProjetada ?? (projPagar > 0 ? Number(((projReceber / projPagar) * 100).toFixed(1)) : null);
            dataFimProjecaoStr = resumo?.periodo?.dataFimProjecao || '';
        }
    } else if (horizonte === 'livre') {
        horizonLabel = 'Personalizado';
        projReceber = receber.projetado ?? 0;
        projPagar = pagar.projetado ?? 0;
        projSaldoLiquido = resumo?.saldoLiquido?.projetado ?? (projReceber - projPagar);
        projCobertura = resumo?.saldoLiquido?.indiceCoberturaProjetada ?? (projPagar > 0 ? Number(((projReceber / projPagar) * 100).toFixed(1)) : null);
        dataFimProjecaoStr = resumo?.periodo?.dataFimProjecao || '';
    } else {
        // Padrão: 7 dias
        horizonLabel = '7 Dias';
        projReceber = resumo?.horizontes?.d7?.receber ?? receber.aVencer7;
        projPagar = resumo?.horizontes?.d7?.pagar ?? pagar.aVencer7;
        projSaldoLiquido = resumo?.horizontes?.d7?.saldoLiquido ?? (projReceber - projPagar);
        projCobertura = resumo?.horizontes?.d7?.indiceCobertura ?? (projPagar > 0 ? Number(((projReceber / projPagar) * 100).toFixed(1)) : null);
        dataFimProjecaoStr = resumo?.horizontes?.d7?.dataFim || resumo?.periodo?.proximos7Ate || '';
    }

    const dataFimProjecaoFmt = displayDate(dataFimProjecaoStr);
    const dataInicioProjecaoFmt = displayDate(resumo?.periodo?.dataInicioProjecao || dataBaseStr);

    // Proporção para a barra de equilíbrio
    const totalProjecao = projReceber + projPagar;
    const pctReceber = totalProjecao > 0 ? Math.round((projReceber / totalProjecao) * 100) : 50;
    const pctPagar = totalProjecao > 0 ? 100 - pctReceber : 50;

    const handleSwitchHorizonte = (h: '7' | '15' | '30' | 'livre') => {
        setHorizonte(h);
        if (h === '15') {
            if (!resumo?.horizontes?.d15) {
                void refetch({ dias: 15 });
            }
        } else if (h === '30') {
            if (!resumo?.horizontes?.d30) {
                void refetch({ dias: 30 });
            }
        } else if (h === '7') {
            if (!resumo?.horizontes?.d7 && resumo?.periodo?.diasProjecao !== 7) {
                void refetch({ dias: 7 });
            }
        }
    };

    const handleCustomFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customDe || !customAte) return;
        void refetch({ de: customDe, ate: customAte });
    };

    const saldoTotalAberto = resumo?.saldoLiquido?.totalEmAberto ?? (receber.emAberto - pagar.emAberto);

    return (
        <div className="page">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">VISÃO GERAL</p>
                    <h1>Dashboard Financeiro</h1>
                </div>
                {loading && (
                    <span style={{ fontSize: '13px', color: '#4b6357', fontWeight: 500 }}>
                        Atualizando…
                    </span>
                )}
            </div>
            {error && (
                <div
                    className="error"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '16px',
                    }}
                >
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => void refetch()}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #005a36',
                            background: '#005a36',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <IconRefresh size={14} /> Tentar novamente
                    </button>
                </div>
            )}

            {/* Toolbar de Controle de Projeção */}
            <div className="projecao-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#4b6357', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        Projeção de Fluxo:
                    </span>
                    <div className="segmented-control" role="tablist">
                        <button
                            type="button"
                            className={horizonte === '7' ? 'active' : ''}
                            onClick={() => handleSwitchHorizonte('7')}
                        >
                            7 Dias
                        </button>
                        <button
                            type="button"
                            className={horizonte === '15' ? 'active' : ''}
                            onClick={() => handleSwitchHorizonte('15')}
                        >
                            15 Dias
                        </button>
                        <button
                            type="button"
                            className={horizonte === '30' ? 'active' : ''}
                            onClick={() => handleSwitchHorizonte('30')}
                        >
                            30 Dias
                        </button>
                        <button
                            type="button"
                            className={horizonte === 'livre' ? 'active' : ''}
                            onClick={() => handleSwitchHorizonte('livre')}
                        >
                            Livre
                        </button>
                    </div>
                </div>

                {horizonte === 'livre' && (
                    <form onSubmit={handleCustomFilterSubmit} className="custom-range-form">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>De:</span>
                            <input
                                type="date"
                                required
                                value={customDe}
                                onChange={(e) => setCustomDe(e.target.value)}
                            />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Até:</span>
                            <input
                                type="date"
                                required
                                value={customAte}
                                onChange={(e) => setCustomAte(e.target.value)}
                            />
                        </label>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Calculando…' : 'Aplicar'}
                        </button>
                    </form>
                )}
            </div>

            {/* Banner com o período e critérios de análise */}
            <div
                style={{
                    background: '#ffffff',
                    border: '1px solid #e2eae6',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    marginBottom: '24px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                        style={{
                            background: '#e8f5ef',
                            color: '#0d5c3a',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <IconCalendar size={18} />
                    </div>
                    <div>
                        <span style={{ fontSize: '11px', color: '#6a8878', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                            Período de Referência
                        </span>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e3028' }}>
                            Data Base: {dataBaseFmt}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                        style={{
                            fontSize: '11px',
                            background: '#fef2f2',
                            color: '#991b1b',
                            border: '1px solid #fecaca',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontWeight: 500
                        }}
                    >
                        Vencidos: até {vencidosAteFmt}
                    </span>
                    <span
                        style={{
                            fontSize: '11px',
                            background: '#f0fdf4',
                            color: '#166534',
                            border: '1px solid #bbf7d0',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontWeight: 500
                        }}
                    >
                        Projeção ({horizonLabel}): {dataInicioProjecaoFmt} até {dataFimProjecaoFmt}
                    </span>
                    <span
                        style={{
                            fontSize: '11px',
                            background: '#f0f9ff',
                            color: '#075985',
                            border: '1px solid #bae6fd',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontWeight: 500
                        }}
                    >
                        Total em Carteira: {resumo?.totalGeral ?? 0} registros
                    </span>
                </div>
            </div>

            {isEmpty && (
                <div
                    style={{
                        padding: '16px 20px',
                        marginBottom: '24px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div>
                        <strong>Sincronizando com a TagPlus...</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#15803d' }}>
                            Os dados da API estão sendo importados em segundo plano. Clique em Atualizar no topo ou aguarde alguns segundos.
                        </p>
                    </div>
                    <button
                        onClick={() => void refetch()}
                        style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            border: '1px solid #166534',
                            background: '#166534',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px'
                        }}
                    >
                        <IconRefresh size={14} /> Atualizar
                    </button>
                </div>
            )}

            {/* SEÇÃO 1: Relação Contas a Pagar x Contas a Receber (Balanço Operacional) */}
            <p className="metric-group-title">
                Balanço Operacional & Relação Receber x Pagar
            </p>
            <div className="balanco-grid">
                <div className={`card-balanco ${projSaldoLiquido >= 0 ? 'superavit' : 'deficit'}`}>
                    <span style={{ fontSize: '10px', letterSpacing: '1px', color: '#6a8878', fontWeight: 700, textTransform: 'uppercase' }}>
                        Saldo Líquido Projetado ({horizonLabel})
                    </span>
                    <strong style={{ fontFamily: 'Manrope, Arial, sans-serif', fontSize: '26px', letterSpacing: '-1px', margin: '14px 0 8px' }}>
                        {money(projSaldoLiquido)}
                    </strong>
                    <small style={{ color: projSaldoLiquido >= 0 ? '#107e3e' : '#c0392b', fontWeight: 500 }}>
                        {projSaldoLiquido >= 0 ? 'Superávit previsto no horizonte' : 'Necessidade de caixa no horizonte'}
                    </small>
                    <span className="card-decoration">
                        <IconScale size={48} />
                    </span>
                </div>

                <div className="card-balanco neutro">
                    <span style={{ fontSize: '10px', letterSpacing: '1px', color: '#6a8878', fontWeight: 700, textTransform: 'uppercase' }}>
                        Saldo Geral da Carteira
                    </span>
                    <strong style={{ fontFamily: 'Manrope, Arial, sans-serif', fontSize: '26px', letterSpacing: '-1px', margin: '14px 0 8px', color: saldoTotalAberto >= 0 ? '#0d5c3a' : '#c0392b' }}>
                        {money(saldoTotalAberto)}
                    </strong>
                    <small style={{ color: '#6c7a74' }}>
                        Receber em aberto − Pagar em aberto
                    </small>
                    <span className="card-decoration">
                        <IconScale size={48} />
                    </span>
                </div>

                <div className="card-balanco neutro">
                    <span style={{ fontSize: '10px', letterSpacing: '1px', color: '#6a8878', fontWeight: 700, textTransform: 'uppercase' }}>
                        Índice de Cobertura ({horizonLabel})
                    </span>
                    <strong style={{ fontFamily: 'Manrope, Arial, sans-serif', fontSize: '26px', letterSpacing: '-1px', margin: '14px 0 8px', color: '#0d5c3a' }}>
                        {projCobertura !== null ? `${projCobertura}%` : '—'}
                    </strong>
                    <small style={{ color: '#6c7a74' }}>
                        {projPagar > 0
                            ? `R$ ${(projReceber / projPagar).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a receber por R$ 1 a pagar`
                            : 'Sem pagamentos previstos no período'}
                    </small>
                    <span className="card-decoration">
                        <IconScale size={48} />
                    </span>
                </div>
            </div>

            {/* Barra de Equilíbrio Proporcional */}
            <div className="balance-bar-container">
                <div className="balance-bar-header">
                    <span>Equilíbrio Operacional na Projeção ({horizonLabel})</span>
                    <span>Total Previsto: {money(totalProjecao)}</span>
                </div>
                <div className="balance-bar-track">
                    <div
                        className="balance-bar-segment-receber"
                        style={{ width: `${pctReceber}%` }}
                        title={`Recebimentos: ${money(projReceber)} (${pctReceber}%)`}
                    />
                    <div
                        className="balance-bar-segment-pagar"
                        style={{ width: `${pctPagar}%` }}
                        title={`Pagamentos: ${money(projPagar)} (${pctPagar}%)`}
                    />
                </div>
                <div className="balance-bar-legend">
                    <div className="legend-item">
                        <span className="legend-dot receber" />
                        <span>Recebimentos: <strong>{money(projReceber)}</strong> ({pctReceber}%)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot pagar" />
                        <span>Pagamentos: <strong>{money(projPagar)}</strong> ({pctPagar}%)</span>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 2: Contas a Receber */}
            <p className="metric-group-title">
                Contas a Receber
            </p>
            <div className="metric-grid">
                <div className="card card-receber">
                    <span>Total em Aberto</span>
                    <strong>{money(receber.emAberto)}</strong>
                    <small>Lançamentos Crédito não liquidados</small>
                    <span className="card-decoration"><IconReceber size={48} /></span>
                </div>
                <div className="card card-vencido">
                    <span>Total Vencido</span>
                    <strong className="negative">{money(receber.vencido)}</strong>
                    <small>Vencimentos até {vencidosAteFmt}</small>
                    <span className="card-decoration"><IconAlert size={48} /></span>
                </div>
                <div className="card card-receber">
                    <span>A Vencer ({horizonLabel})</span>
                    <strong>{money(projReceber)}</strong>
                    <small>De {dataInicioProjecaoFmt} até {dataFimProjecaoFmt}</small>
                    <span className="card-decoration"><IconCalendar size={48} /></span>
                </div>
            </div>

            {/* SEÇÃO 3: Contas a Pagar */}
            <p className="metric-group-title" style={{ marginTop: '24px' }}>
                Contas a Pagar
            </p>
            <div className="metric-grid">
                <div className="card card-pagar">
                    <span>Total em Aberto</span>
                    <strong>{money(pagar.emAberto)}</strong>
                    <small>Lançamentos Débito não liquidados</small>
                    <span className="card-decoration"><IconPagar size={48} /></span>
                </div>
                <div className="card card-vencido">
                    <span>Total Vencido</span>
                    <strong className="negative">{money(pagar.vencido)}</strong>
                    <small>Vencimentos até {vencidosAteFmt}</small>
                    <span className="card-decoration"><IconAlert size={48} /></span>
                </div>
                <div className="card card-pagar">
                    <span>A Vencer ({horizonLabel})</span>
                    <strong>{money(projPagar)}</strong>
                    <small>De {dataInicioProjecaoFmt} até {dataFimProjecaoFmt}</small>
                    <span className="card-decoration"><IconCalendar size={48} /></span>
                </div>
            </div>
        </div>
    );
}
