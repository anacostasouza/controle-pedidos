import React from 'react';
import { usePedidos } from '../hooks/usePedidos';
import { PedidosKpis } from '../components/pedidos/PedidosKpis';
import { PedidosFiltros } from '../components/pedidos/PedidosFiltros';
import { PedidosTable } from '../components/pedidos/PedidosTable';
import { IconRefresh } from '../components/icons/Icons';

export const PedidosPage: React.FC = () => {
    const {
        pedidos,
        kpis,
        total,
        totalPages,
        loading,
        error,
        filtros,
        atualizarFiltros,
        recarregar,
    } = usePedidos();

    return (
        <div className="page">
            {/* Header da Página idêntico a Contas a Receber / Dashboard */}
            <div className="page-heading">
                <div>
                    <p className="eyebrow">COMERCIAL / VENDAS</p>
                    <h1>Vendas Simples</h1>
                    <p>Acompanhamento de vendas rápidas sincronizadas do TagPlus ERP ({total} vendas no período)</p>
                </div>

                <button
                    type="button"
                    onClick={() => void recarregar()}
                    disabled={loading}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <IconRefresh size={15} className={loading ? 'spin' : ''} />
                    {loading ? 'Atualizando…' : 'Atualizar agora'}
                </button>
            </div>

            {/* Mensagem de Erro (se houver) */}
            {error && <p className="error">{error}</p>}

            {/* Cards de Métricas em 4 colunas horizontais */}
            <PedidosKpis kpis={kpis} loading={loading} />

            {/* Barra de Filtros com classe .filtros */}
            <PedidosFiltros filtros={filtros} onChange={atualizarFiltros} />

            {/* Tabela de Vendas Simples com paginação */}
            <PedidosTable
                pedidos={pedidos}
                loading={loading}
                page={filtros.page || 1}
                totalPages={totalPages}
                total={total}
                onPageChange={(newPage) => atualizarFiltros({ page: newPage })}
            />
        </div>
    );
};
