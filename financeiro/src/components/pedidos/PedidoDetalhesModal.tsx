import React, { useEffect, useState } from 'react';
import type { PedidoVenda } from '../../contracts';
import { money, displayDate, displayDateTime, api } from '../../api';

type PedidoDetalhesModalProps = {
    pedido: PedidoVenda | null;
    onClose: () => void;
};

export const PedidoDetalhesModal: React.FC<PedidoDetalhesModalProps> = ({ pedido, onClose }) => {
    const [detalhes, setDetalhes] = useState<PedidoVenda | null>(pedido);
    const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

    useEffect(() => {
        setDetalhes(pedido);
        if (!pedido?.id) return;

        let cancelado = false;
        setCarregandoDetalhes(true);

        api<PedidoVenda>(`/financeiro/pedidos/${pedido.id}`)
            .then((data) => {
                if (!cancelado && data) {
                    setDetalhes(data);
                }
            })
            .catch((err) => {
                console.warn('Não foi possível carregar detalhes extras do pedido:', err);
            })
            .finally(() => {
                if (!cancelado) setCarregandoDetalhes(false);
            });

        return () => {
            cancelado = true;
        };
    }, [pedido]);

    if (!pedido) return null;

    const info = detalhes || pedido;
    const isConfirmado = info.confirmado || info.status === 'confirmado';
    const isCancelado = info.status === 'cancelado';

    const cleanPhone = info.cliente_telefone ? info.cliente_telefone.replace(/\D/g, '') : '';
    const whatsappUrl = cleanPhone.length >= 10 ? `https://wa.me/55${cleanPhone}` : null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(13, 61, 42, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(3px)',
                padding: '16px',
            }}
            onClick={onClose}
        >
            <div
                className="panel"
                style={{
                    width: '100%',
                    maxWidth: '840px',
                    maxHeight: '92vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '18px 24px',
                        borderBottom: '1px solid var(--line)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f8faf9',
                    }}
                >
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--navy)' }}>
                                Venda Simples #{info.numero}
                            </h3>
                            <span
                                className={`badge badge-${
                                    isConfirmado ? 'liquidado' : isCancelado ? 'cancelado' : 'aberto'
                                }`}
                            >
                                {isConfirmado ? 'Confirmado' : isCancelado ? 'Cancelado' : 'Em Aberto'}
                            </span>
                            {carregandoDetalhes && (
                                <span style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic' }}>
                                    Atualizando detalhes…
                                </span>
                            )}
                        </div>
                        <small style={{ color: 'var(--muted)', marginTop: '4px', display: 'block', fontSize: '12px' }}>
                            Data de Criação: {displayDateTime(info.data_criacao || info.data_emissao)}
                            {info.data_faturamento && ` • Confirmação: ${displayDateTime(info.data_faturamento)}`}
                        </small>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '22px',
                            cursor: 'pointer',
                            color: 'var(--muted)',
                            padding: '4px 8px',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Conteúdo */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Seção 1: Cliente e Endereço */}
                    <div
                        style={{
                            background: '#f8faf9',
                            padding: '16px 20px',
                            borderRadius: '10px',
                            border: '1px solid var(--line)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '16px',
                        }}
                    >
                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                                Cliente
                            </span>
                            <strong style={{ fontSize: '15px', color: '#1a2e24', display: 'block', marginTop: '2px' }}>
                                {info.cliente_nome}
                            </strong>
                            {info.cliente_documento && (
                                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                                    Documento: {info.cliente_documento}
                                </span>
                            )}
                        </div>

                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                                Contato
                            </span>
                            {info.cliente_telefone ? (
                                <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <strong style={{ fontSize: '13px', color: 'var(--navy)' }}>
                                        {info.cliente_telefone}
                                    </strong>
                                    {whatsappUrl && (
                                        <a
                                            href={whatsappUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                background: '#25d366',
                                                color: '#fff',
                                                borderRadius: '4px',
                                                textDecoration: 'none',
                                                fontWeight: 700,
                                            }}
                                        >
                                            WhatsApp
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
                                    Telefone não informado
                                </span>
                            )}
                            {info.cliente_email && (
                                <small style={{ color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                                    {info.cliente_email}
                                </small>
                            )}
                        </div>

                        {info.cliente_endereco && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                                    Endereço Cadastrado
                                </span>
                                <span style={{ fontSize: '12px', color: '#2c4438', display: 'block', marginTop: '2px' }}>
                                    {info.cliente_endereco}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Seção 2: Atendimento e Faturamento */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '14px',
                            background: '#ffffff',
                            padding: '16px 20px',
                            borderRadius: '10px',
                            border: '1px solid var(--line)',
                        }}
                    >
                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                                Vendedor Responsável
                            </span>
                            <strong style={{ fontSize: '13px', color: '#165c3c', display: 'block', marginTop: '3px' }}>
                                {info.vendedor_nome || 'Não informado'}
                            </strong>
                        </div>

                        {info.funcionario_nome && (
                            <div>
                                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                                    Operador / Emissor
                                </span>
                                <strong style={{ fontSize: '13px', color: '#2c4438', display: 'block', marginTop: '3px' }}>
                                    {info.funcionario_nome}
                                </strong>
                            </div>
                        )}

                        {info.departamento_nome && (
                            <div>
                                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                                    Departamento
                                </span>
                                <span style={{ fontSize: '13px', color: '#2c4438', display: 'block', marginTop: '3px' }}>
                                    {info.departamento_nome}
                                </span>
                            </div>
                        )}

                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                                Forma de Pagamento
                            </span>
                            <strong style={{ fontSize: '13px', color: '#1a2e24', display: 'block', marginTop: '3px' }}>
                                {info.forma_pagamento_nome || 'Padrão TagPlus'}
                            </strong>
                        </div>

                        {info.categoria_nome && (
                            <div>
                                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                                    Plano / Categoria
                                </span>
                                <span style={{ fontSize: '13px', color: '#2c4438', display: 'block', marginTop: '3px' }}>
                                    {info.categoria_nome}
                                </span>
                            </div>
                        )}

                        {info.conta_bancaria_nome && (
                            <div>
                                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                                    Conta Bancária
                                </span>
                                <span style={{ fontSize: '13px', color: '#2c4438', display: 'block', marginTop: '3px' }}>
                                    {info.conta_bancaria_nome}
                                </span>
                            </div>
                        )}

                        {info.numero_documento && (
                            <div>
                                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                                    Nº Documento / Fatura
                                </span>
                                <strong style={{ fontSize: '13px', color: '#2c4438', display: 'block', marginTop: '3px' }}>
                                    {info.numero_documento}
                                </strong>
                            </div>
                        )}
                    </div>

                    {/* Seção 3: Parcelamento / Vencimentos */}
                    {info.parcelas && info.parcelas.length > 0 && (
                        <div>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--navy)' }}>
                                Condições de Pagamento / Parcelas ({info.parcelas.length})
                            </h4>
                            <div className="panel" style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: 0, overflow: 'hidden' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '90px' }}>Parcela</th>
                                            <th>Nº Documento</th>
                                            <th className="col-date">Vencimento</th>
                                            <th className="col-val">Valor</th>
                                            <th className="col-status">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {info.parcelas.map((parc, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 700 }}>
                                                    {parc.parcela} / {parc.total_parcelas}
                                                </td>
                                                <td>{parc.documento || info.numero_documento || '—'}</td>
                                                <td className="col-date">{displayDate(parc.data_vencimento)}</td>
                                                <td className="col-val">{money(parc.valor)}</td>
                                                <td className="col-status">
                                                    <span className={`badge ${parc.confirmado ? 'badge-liquidado' : 'badge-aberto'}`}>
                                                        {parc.confirmado ? 'Liquidado' : 'A Vencer'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Seção 4: Produtos / Serviços da Venda */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--navy)' }}>
                                Produtos / Serviços da Venda ({info.itens?.length || 0})
                            </h4>
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                Modelo: {info.modelo || 'SD - Venda Simples Direta'}
                            </span>
                        </div>
                        {info.itens && info.itens.length > 0 ? (
                            <div className="panel" style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: 0, overflow: 'hidden' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Produto / Serviço</th>
                                            <th style={{ textAlign: 'center', width: '80px' }}>Qtd</th>
                                            <th style={{ textAlign: 'right', width: '120px' }}>Unitário</th>
                                            <th style={{ textAlign: 'right', width: '120px' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {info.itens.map((it, idx) => (
                                            <tr key={it.id || idx}>
                                                <td className="col-desc">
                                                    <strong style={{ color: '#1a2e24', fontSize: '13px' }}>{it.descricao}</strong>
                                                    {it.codigo && <small style={{ display: 'block', marginTop: '2px', color: 'var(--muted)' }}>Código: {it.codigo}</small>}
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.quantidade}</td>
                                                <td className="col-val-secondary">{money(it.valor_unitario)}</td>
                                                <td className="col-val">{money(it.valor_total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                                Nenhum produto ou serviço listado para esta venda.
                            </p>
                        )}
                    </div>

                    {/* Descrição e Observações da Venda */}
                    {info.observacoes && (
                        <div>
                            <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                                Descrição e Observações da Venda
                            </span>
                            <div
                                style={{
                                    fontSize: '13px',
                                    background: '#f8faf9',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--line)',
                                    marginTop: '4px',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.5,
                                    color: '#2c4438',
                                }}
                            >
                                {info.observacoes}
                            </div>
                        </div>
                    )}

                    {/* Totais do Pedido */}
                    <div
                        style={{
                            borderTop: '2px solid var(--line)',
                            paddingTop: '16px',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '24px',
                            alignItems: 'baseline',
                        }}
                    >
                        {Boolean(info.valor_desconto) && (
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ color: 'var(--muted)', fontSize: '12px', display: 'block' }}>Desconto:</span>
                                <strong style={{ color: 'var(--red)', fontSize: '15px' }}>
                                    - {money(info.valor_desconto || 0)}
                                </strong>
                            </div>
                        )}
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ color: 'var(--muted)', fontSize: '12px', display: 'block' }}>Valor Total da Venda:</span>
                            <strong style={{ fontSize: '22px', color: '#168566', fontFamily: 'Manrope, sans-serif' }}>
                                {money(info.valor_total)}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* Rodapé Modal */}
                <div
                    style={{
                        padding: '14px 24px',
                        borderTop: '1px solid var(--line)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        background: '#f8faf9',
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '8px 22px',
                            borderRadius: '8px',
                            border: '1px solid var(--line)',
                            background: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                            color: 'var(--navy)',
                        }}
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
