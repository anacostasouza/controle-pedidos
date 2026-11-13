import React from 'react';
import { money } from '../../api';
import { IconShoppingCart, IconCheckCircle, IconClock, IconScale } from '../icons/Icons';

type PedidosKpisProps = {
    kpis: {
        totalPedidos: number;
        totalValor: number;
        totalConfirmados: number;
        totalValorConfirmados: number;
        totalAbertos: number;
        totalValorAbertos: number;
        ticketMedio: number;
    };
    loading?: boolean;
};

export const PedidosKpis: React.FC<PedidosKpisProps> = ({ kpis, loading }) => {
    return (
        <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
            {/* Card 1: Total Geral */}
            <div className="card card-receber">
                <span>TOTAL DE VENDAS SIMPLES</span>
                <strong>{loading ? '…' : kpis.totalPedidos}</strong>
                <small style={{ color: '#0d5c3a', fontWeight: 600 }}>
                    {loading ? '…' : money(kpis.totalValor)}
                </small>
                <div className="card-decoration">
                    <IconShoppingCart size={54} color="#0d5c3a" />
                </div>
            </div>

            {/* Card 2: Confirmados */}
            <div className="card" style={{ borderLeft: '3px solid #168566' }}>
                <span>CONFIRMADAS</span>
                <strong style={{ color: '#168566' }}>
                    {loading ? '…' : kpis.totalConfirmados}
                </strong>
                <small style={{ color: '#168566', fontWeight: 600 }}>
                    {loading ? '…' : money(kpis.totalValorConfirmados)}
                </small>
                <div className="card-decoration">
                    <IconCheckCircle size={54} color="#168566" />
                </div>
            </div>

            {/* Card 3: Em Aberto */}
            <div className="card" style={{ borderLeft: '3px solid #b37400' }}>
                <span>EM ABERTO</span>
                <strong style={{ color: '#b37400' }}>
                    {loading ? '…' : kpis.totalAbertos}
                </strong>
                <small style={{ color: '#b37400', fontWeight: 600 }}>
                    {loading ? '…' : money(kpis.totalValorAbertos)}
                </small>
                <div className="card-decoration">
                    <IconClock size={54} color="#b37400" />
                </div>
            </div>

            {/* Card 4: Ticket Médio */}
            <div className="card" style={{ borderLeft: '3px solid #5a3eb8' }}>
                <span>TICKET MÉDIO</span>
                <strong style={{ color: '#5a3eb8' }}>
                    {loading ? '…' : money(kpis.ticketMedio)}
                </strong>
                <small style={{ color: 'var(--muted)' }}>por venda</small>
                <div className="card-decoration">
                    <IconScale size={54} color="#5a3eb8" />
                </div>
            </div>
        </div>
    );
};
