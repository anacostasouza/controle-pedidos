import React, { useState } from 'react';
import type { PedidoVenda } from '../../contracts';
import { money, displayDate } from '../../api';
import { PedidoDetalhesModal } from './PedidoDetalhesModal';
import { IconChevronLeft, IconChevronRight } from '../icons/Icons';

type PedidosTableProps = {
    pedidos: PedidoVenda[];
    loading?: boolean;
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (newPage: number) => void;
};

export const PedidosTable: React.FC<PedidosTableProps> = ({
    pedidos,
    loading,
    page,
    totalPages,
    total,
    onPageChange,
}) => {
    const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoVenda | null>(null);

    return (
        <div className="panel">
            {/* Barra de resumo de cabeçalho idêntica a Contas a Receber */}
            <div className="table-summary-bar">
                <span>
                    Exibindo <strong>{pedidos.length}</strong> de <strong>{total}</strong> vendas simples
                </span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                </span>
            </div>

            <div className="table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '100px' }}>Nº Venda</th>
                            <th className="col-date">Data Criação</th>
                            <th className="col-desc">Cliente</th>
                            <th className="col-entity">Vendedor</th>
                            <th className="col-val">Valor Total</th>
                            <th className="col-status">Status</th>
                            <th style={{ textAlign: 'center', width: '90px' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="empty">
                                    <p>Carregando vendas do TagPlus…</p>
                                </td>
                            </tr>
                        ) : pedidos.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="empty">
                                    <p>Nenhuma venda simples encontrada para os filtros selecionados.</p>
                                </td>
                            </tr>
                        ) : (
                            pedidos.map((p) => {
                                const isConfirmado = p.confirmado || p.status === 'confirmado';
                                const isCancelado = p.status === 'cancelado';

                                return (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>
                                            #{p.numero}
                                        </td>
                                        <td className="col-date">
                                            {displayDate(p.data_emissao)}
                                        </td>
                                        <td className="col-desc">
                                            <strong>{p.cliente_nome}</strong>
                                            {p.cliente_documento && (
                                                <small>Doc: {p.cliente_documento}</small>
                                            )}
                                        </td>
                                        <td className="col-entity">
                                            {p.vendedor_nome ? (
                                                <strong style={{ color: '#0d5c3a' }}>{p.vendedor_nome}</strong>
                                            ) : (
                                                <small style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                                                    Não informado
                                                </small>
                                            )}
                                        </td>
                                        <td className="col-val">
                                            {money(p.valor_total)}
                                        </td>
                                        <td className="col-status">
                                            <span
                                                className={`badge ${
                                                    isConfirmado
                                                        ? 'badge-liquidado'
                                                        : isCancelado
                                                          ? 'badge-cancelado'
                                                          : 'badge-aberto'
                                                }`}
                                            >
                                                {isConfirmado ? 'Confirmado' : isCancelado ? 'Cancelado' : 'Em Aberto'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={() => setPedidoSelecionado(p)}
                                                style={{
                                                    padding: '5px 10px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginação padrão das telas financeiras */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1 || loading}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                        <IconChevronLeft size={14} /> Anterior
                    </button>
                    <span>
                        Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                    </span>
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages || loading}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                        Próxima <IconChevronRight size={14} />
                    </button>
                </div>
            )}

            {/* Modal de Detalhes */}
            {pedidoSelecionado && (
                <PedidoDetalhesModal
                    pedido={pedidoSelecionado}
                    onClose={() => setPedidoSelecionado(null)}
                />
            )}
        </div>
    );
};
