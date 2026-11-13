import React, { useState } from 'react';
import type { FiltrosPedidosVenda, StatusPedidoVenda } from '../../contracts';
import { useVendedores } from '../../hooks/useVendedores';

type PedidosFiltrosProps = {
    filtros: FiltrosPedidosVenda;
    onChange: (parciais: Partial<FiltrosPedidosVenda>) => void;
};

export const PedidosFiltros: React.FC<PedidosFiltrosProps> = ({ filtros, onChange }) => {
    const { vendedores } = useVendedores();
    const [searchTerm, setSearchTerm] = useState(filtros.q || '');

    const handleDataAtalho = (tipo: 'hoje' | 'ontem' | '7dias' | 'mes' | 'limpar') => {
        const hoje = new Date();
        const fmt = (d: Date) => d.toISOString().slice(0, 10);

        if (tipo === 'limpar') {
            onChange({ data_inicio: undefined, data_fim: undefined, page: 1 });
            return;
        }

        if (tipo === 'hoje') {
            const hStr = fmt(hoje);
            onChange({ data_inicio: hStr, data_fim: hStr, page: 1 });
        } else if (tipo === 'ontem') {
            const ontem = new Date(hoje);
            ontem.setDate(hoje.getDate() - 1);
            const oStr = fmt(ontem);
            onChange({ data_inicio: oStr, data_fim: oStr, page: 1 });
        } else if (tipo === '7dias') {
            const d7 = new Date(hoje);
            d7.setDate(hoje.getDate() - 7);
            onChange({ data_inicio: fmt(d7), data_fim: fmt(hoje), page: 1 });
        } else if (tipo === 'mes') {
            const dMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            onChange({ data_inicio: fmt(dMes), data_fim: fmt(hoje), page: 1 });
        }
    };

    const hasFilters = Boolean(
        filtros.status ||
        filtros.vendedor_id ||
        filtros.data_inicio ||
        filtros.data_fim ||
        filtros.q
    );

    const clearAll = () => {
        setSearchTerm('');
        onChange({
            status: undefined,
            vendedor_id: undefined,
            data_inicio: undefined,
            data_fim: undefined,
            q: undefined,
            page: 1,
        });
    };

    return (
        <div className="filtros" style={{ marginBottom: '22px' }}>
            {/* Status */}
            <div className="field">
                <label>Status</label>
                <select
                    value={filtros.status || ''}
                    onChange={(e) =>
                        onChange({
                            status: (e.target.value as StatusPedidoVenda) || undefined,
                            page: 1,
                        })
                    }
                >
                    <option value="">Todas</option>
                    <option value="confirmado">Confirmadas</option>
                    <option value="aberto">Em Aberto</option>
                    <option value="cancelado">Canceladas</option>
                </select>
            </div>

            {/* Vendedor */}
            <div className="field">
                <label>Vendedor</label>
                <select
                    value={filtros.vendedor_id || ''}
                    onChange={(e) =>
                        onChange({
                            vendedor_id: e.target.value ? Number(e.target.value) : undefined,
                            page: 1,
                        })
                    }
                >
                    <option value="">Todos os Vendedores</option>
                    {vendedores.map((v) => (
                        <option key={v.id} value={v.id}>
                            {v.nome}
                        </option>
                    ))}
                </select>
            </div>

            {/* Data Inicial */}
            <div className="field">
                <label>Data de</label>
                <input
                    type="date"
                    value={filtros.data_inicio || ''}
                    onChange={(e) =>
                        onChange({
                            data_inicio: e.target.value || undefined,
                            page: 1,
                        })
                    }
                />
            </div>

            {/* Data Final */}
            <div className="field">
                <label>Data até</label>
                <input
                    type="date"
                    value={filtros.data_fim || ''}
                    onChange={(e) =>
                        onChange({
                            data_fim: e.target.value || undefined,
                            page: 1,
                        })
                    }
                />
            </div>

            {/* Busca textual */}
            <div className="field" style={{ flex: 2, minWidth: '180px' }}>
                <label>Buscar</label>
                <input
                    type="search"
                    placeholder="Nº da venda, cliente, CPF/CNPJ…"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        onChange({ q: e.target.value.trim() || undefined, page: 1 });
                    }}
                />
            </div>

            {/* Atalhos de Data */}
            <div className="field" style={{ flex: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                        type="button"
                        onClick={() => handleDataAtalho('hoje')}
                        style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600 }}
                    >
                        Hoje
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDataAtalho('ontem')}
                        style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600 }}
                    >
                        Ontem
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDataAtalho('7dias')}
                        style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600 }}
                    >
                        7 dias
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDataAtalho('mes')}
                        style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600 }}
                    >
                        Mês
                    </button>
                    {hasFilters && (
                        <button
                            type="button"
                            onClick={clearAll}
                            style={{
                                padding: '8px 12px',
                                fontSize: '11px',
                                background: '#fef2f2',
                                color: 'var(--red)',
                                borderColor: '#fca5a5',
                                fontWeight: 600,
                            }}
                        >
                            Limpar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
