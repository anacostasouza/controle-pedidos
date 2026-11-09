export type TipoLancamento = "C" | "D"; // C=Receber, D=Pagar
export type StatusLancamento = "aberto" | "liquidado" | "vencido" | "cancelado";

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
  _synced_at?: string;
}

export interface FiltrosLancamento {
  tipo?: TipoLancamento;
  status?: StatusLancamento;
  data_vencimento_inicial?: string;
  data_vencimento_final?: string;
  data_pagamento_inicial?: string;
  data_pagamento_final?: string;
  entidade_id?: number;
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

export interface AuxiliaresFinanceiro {
  contas: { id: number; nome: string; banco?: string }[];
  formasPagamento: { id: number; nome: string }[];
  planosOrcamentarios: { id: number; nome: string }[];
}

export interface BaixaPayload {
  valor_pago: number;
  data_pagamento: string;
  forma_pagamento_id: number;
  conta_bancaria_id?: number;
}

export interface SyncMeta {
  lastSyncAt: string | null;
  totalSynced: number;
  nextSyncAt: string | null;
  status: "ok" | "error" | "running";
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
    diasProjecao?: number | "livre";
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
  syncStatus: "ok" | "error" | "running";
}

export interface CriarLancamentoPayload {
  descricao: string;
  valor: number;
  data_vencimento: string;
  forma_pagamento_id: number;
  tipo: TipoLancamento;
  data_emissao?: string;
  valor_pago?: number;
  data_pagamento?: string;
  entidade_id?: number;
  conta_bancaria_id?: number;
  plano_orcamentario_id?: number;
  observacoes?: string;
}
