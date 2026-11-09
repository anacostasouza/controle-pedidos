export type TipoLancamento = 'C' | 'D';
export type StatusLancamento = 'aberto' | 'liquidado' | 'vencido' | 'cancelado';

export interface LancamentoFinanceiro {
  id: number;
  descricao: string;
  valor: number;
  valor_pago: number;
  data_emissao: string | null;
  data_vencimento: string;
  data_pagamento: string | null;
  tipo: TipoLancamento;
  status: StatusLancamento;
  entidade_id: number | null;
  entidade_nome: string | null;
  forma_pagamento_id: number | null;
  forma_pagamento_nome: string | null;
  conta_bancaria_id: number | null;
  plano_orcamentario_id: number | null;
  observacoes: string | null;
}

export interface FiltrosLancamento {
  tipo?: TipoLancamento;
  status?: StatusLancamento;
  data_vencimento_inicial?: string;
  data_vencimento_final?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface PagedLancamentos {
  items: LancamentoFinanceiro[];
  total: number;
  page: number;
  totalPages: number;
  syncedAt: string | null;
  totalValorGeral?: number;
  totalPendenteGeral?: number;
}

export interface SyncMeta {
  lastSyncAt: string | null;
  totalSynced: number;
  status: 'ok' | 'error' | 'running';
}

export interface ProjecaoItem {
  receber: number;
  pagar: number;
  saldoLiquido: number;
  indiceCobertura: number | null;
  dataFim: string;
}

export interface ResumoFinanceiro {
  periodo?: {
    dataBase: string;
    vencidosAte: string;
    proximos7Ate: string;
    diasProjecao?: number | 'livre';
    dataInicioProjecao?: string;
    dataFimProjecao?: string;
  };
  receber: {
    emAberto: number;
    vencido: number;
    aVencer7: number;
    projetado?: number;
    totalRegistros: number;
  };
  pagar: {
    emAberto: number;
    vencido: number;
    aVencer7: number;
    projetado?: number;
    totalRegistros: number;
  };
  saldoLiquido?: {
    totalEmAberto: number;
    vencido: number;
    projetado: number;
    indiceCoberturaProjetada: number | null;
  };
  horizontes?: {
    d7: ProjecaoItem;
    d15: ProjecaoItem;
    d30: ProjecaoItem;
  };
  totalGeral: number;
  syncedAt: string | null;
  syncStatus: 'ok' | 'error' | 'running';
}
