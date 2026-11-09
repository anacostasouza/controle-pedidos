import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type {
  LancamentoFinanceiro,
  TipoLancamento,
  StatusLancamento,
  FiltrosLancamento,
  BaixaPayload,
  CriarLancamentoPayload,
  AuxiliaresFinanceiro,
} from "./financeiroDomain";

function normalizeArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj["data"])) return obj["data"] as unknown[];
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  return [];
}

export function mapTagPlusRawToLancamento(raw: any): LancamentoFinanceiro {
  const todayStr = new Date().toISOString().slice(0, 10);
  const tipo: TipoLancamento =
    raw.tipo === "S" || raw.tipo === "D" ? "D" : "C";
  const valor = Number(raw.valor_total ?? raw.valor_bruto ?? raw.valor ?? 0);
  const confirmado = Boolean(raw.confirmado);

  let status: StatusLancamento = "aberto";
  let valorPago = 0;
  let dataPagamento: string | null = null;

  if (confirmado) {
    status = "liquidado";
    valorPago = valor;
    dataPagamento = raw.data_pagamento || raw.data_vencimento || null;
  } else if (raw.data_vencimento && raw.data_vencimento < todayStr) {
    status = "vencido";
    valorPago = 0;
  } else {
    status = "aberto";
    valorPago = 0;
  }

  const entidadeNome =
    raw.entidade?.razao_social ||
    raw.entidade?.nome_fantasia ||
    raw.entidade?.nome ||
    raw.entidade_nome ||
    null;

  return {
    id: raw.id,
    descricao:
      raw.descricao ||
      (raw.numero_documento ? `Documento ${raw.numero_documento}` : "Sem descrição"),
    valor,
    valor_pago: valorPago,
    data_emissao: raw.data_emissao || null,
    data_vencimento: raw.data_vencimento || todayStr,
    data_pagamento: dataPagamento,
    tipo,
    status,
    entidade_id: raw.entidade?.id ?? raw.entidade_id ?? null,
    entidade_nome: entidadeNome,
    forma_pagamento_id:
      raw.forma_pagamento?.id ?? raw.forma_pagamento_id ?? null,
    forma_pagamento_nome:
      raw.forma_pagamento?.nome ?? raw.forma_pagamento_nome ?? null,
    conta_bancaria_id: raw.conta_bancaria?.id ?? raw.conta_bancaria_id ?? null,
    plano_orcamentario_id:
      raw.plano_orcamentario?.id ?? raw.plano_orcamentario_id ?? null,
    observacoes: raw.numero_documento ? `Doc: ${raw.numero_documento}` : null,
  };
}

export class FinanceiroClient {
  private axiosInstance: AxiosInstance;

  constructor(options: { accessToken: string }) {
    this.axiosInstance = axios.create({
      baseURL: "https://api.tagplus.com.br",
      headers: {
        "X-Api-Version": "2.0",
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.accessToken}`,
      },
      timeout: 20000,
    });
  }

  private async requestWithRateLimit<T>(
    config: AxiosRequestConfig,
    retries = 2
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.axiosInstance.request<T>(config);
    } catch (error: any) {
      if (error?.response?.status === 429 && retries > 0) {
        const headers = error.response.headers || {};
        const retryAfter =
          headers["retry-after"] ||
          headers["ratelimit-reset"] ||
          headers["x-ratelimit-reset"];
        const waitSec = Math.max(3, Math.min(Number(retryAfter) || 10, 35));
        console.warn(
          `[TAGPLUS 429] Rate limit atingido na TagPlus. Aguardando ${waitSec}s antes de tentar novamente...`
        );
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        return this.requestWithRateLimit<T>(config, retries - 1);
      }
      throw error;
    }
  }

  async buscarFinanceiros(params: FiltrosLancamento): Promise<{
    items: LancamentoFinanceiro[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const resp = await this.requestWithRateLimit<unknown>({
      method: "get",
      url: "/financeiros",
      params: {
        sort: "-id",
        ...params,
      },
    });

    const rawItems = normalizeArray(resp.data);
    const items = rawItems.map(mapTagPlusRawToLancamento);

    const total =
      Number(resp.headers["x-total-count"] ?? 0) || items.length;
    const totalPages =
      Number(resp.headers["x-total-pages"] ?? 1) || 1;
    const page = params.page ?? 1;

    return { items, total, page, totalPages };
  }

  async buscarPorId(id: number): Promise<LancamentoFinanceiro> {
    const resp = await this.requestWithRateLimit<any>({
      method: "get",
      url: `/financeiros/${id}`,
    });
    return mapTagPlusRawToLancamento(resp.data);
  }

  async baixarLancamento(
    id: number,
    payload: BaixaPayload
  ): Promise<LancamentoFinanceiro> {
    const resp = await this.requestWithRateLimit<any>({
      method: "put",
      url: `/financeiros/${id}`,
      data: payload,
    });
    return mapTagPlusRawToLancamento(resp.data);
  }

  async criarLancamento(
    payload: CriarLancamentoPayload
  ): Promise<LancamentoFinanceiro> {
    const resp = await this.requestWithRateLimit<any>({
      method: "post",
      url: "/financeiros",
      data: payload,
    });
    return mapTagPlusRawToLancamento(resp.data);
  }

  async buscarAuxiliares(): Promise<AuxiliaresFinanceiro> {
    const contasResp = await this.requestWithRateLimit<unknown>({
      method: "get",
      url: "/contas",
    });
    await new Promise((r) => setTimeout(r, 400));

    const formasResp = await this.requestWithRateLimit<unknown>({
      method: "get",
      url: "/formas_pagamento",
    });
    await new Promise((r) => setTimeout(r, 400));

    const planosResp = await this.requestWithRateLimit<unknown>({
      method: "get",
      url: "/planos_orcamentarios",
    });

    const contas = normalizeArray(contasResp.data) as {
      id: number;
      nome: string;
      banco?: string;
    }[];
    const formasPagamento = normalizeArray(formasResp.data) as {
      id: number;
      nome: string;
    }[];
    const planosOrcamentarios = normalizeArray(planosResp.data) as {
      id: number;
      nome: string;
    }[];

    return { contas, formasPagamento, planosOrcamentarios };
  }
}
