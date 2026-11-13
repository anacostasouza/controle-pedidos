import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import type {
  LancamentoFinanceiro,
  TipoLancamento,
  StatusLancamento,
  FiltrosLancamento,
  BaixaPayload,
  CriarLancamentoPayload,
  AuxiliaresFinanceiro,
  PedidoVenda,
  StatusPedidoVenda,
  ItemPedidoVenda,
  ParcelaVenda,
  VendedorTagPlus,
  FiltrosPedidosVenda,
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

export function isTagPlusVendaSimples(raw: any): boolean {
  if (!raw) return false;
  if (raw.movimentacao_vinculada?.tipo === "venda_simples" || raw.movimentacao_vinculada?.numero) return true;
  if (raw.numero_sigla_movimentacao_vinculada && /SD/i.test(raw.numero_sigla_movimentacao_vinculada)) return true;
  if (raw.descricao && /Venda Simples/i.test(raw.descricao)) return true;
  return false;
}

export function mapFinanceiroToVendaSimples(raw: any): PedidoVenda {
  const dataHoje = new Date().toISOString().slice(0, 10);
  const mv = raw.movimentacao_vinculada;

  // Extrai o número 32xxxx da movimentação vinculada ou da descrição
  let numeroVenda = mv?.numero ? String(mv.numero) : "";
  if (!numeroVenda && raw.descricao) {
    const match = raw.descricao.match(/Venda Simples de número (\d+)/i);
    if (match) numeroVenda = match[1];
  }
  if (!numeroVenda) {
    numeroVenda = String(raw.id || "");
  }

  // Data de criação real da venda: prioriza a data de confirmação/criação da movimentação ou a data de lançamento
  const dataCriacaoRaw = mv?.data_confirmacao || raw.data_alteracao || raw.data_lancamento || dataHoje;
  const dataCriacao = typeof dataCriacaoRaw === "string" ? dataCriacaoRaw.slice(0, 10) : dataHoje;

  // No TagPlus, a venda simples vinculada tem status "Confirmado" se possui movimentação vinculada confirmada ou se o lançamento foi liquidado
  const confirmado = Boolean(
    raw.confirmado ||
      Boolean(mv?.data_confirmacao) ||
      raw.data_confirmacao
  );
  const status: StatusPedidoVenda = confirmado ? "confirmado" : "aberto";

  const clienteNome =
    mv?.cliente ||
    raw.entidade?.razao_social ||
    raw.entidade?.nome_fantasia ||
    "Cliente consumidor / consumidor final";

  const clienteDoc =
    raw.entidade?.cnpj || raw.entidade?.cpf || null;

  const vendedorNome =
    raw.funcionario_responsavel?.nome ||
    raw.funcionario?.nome ||
    "Não informado";

  const vendedorId =
    raw.funcionario_responsavel?.id ??
    raw.funcionario?.id ??
    null;

  const valorTotal = Number(
    (mv?.vr_total ? Number(mv.vr_total) : null) ??
      raw.valor_total ??
      raw.valor_bruto ??
      raw.valor_original ??
      0
  );

  const parcelas: ParcelaVenda[] = [];
  if (raw.fatura_parcela_vinculada) {
    parcelas.push({
      parcela: Number(raw.fatura_parcela_vinculada.parcela || 1),
      total_parcelas: Number(raw.total_parcelas || 1),
      documento: raw.fatura_parcela_vinculada.documento || raw.numero_documento,
      valor: Number(raw.fatura_parcela_vinculada.valor_parcela || valorTotal),
      data_vencimento: raw.fatura_parcela_vinculada.data_vencimento || raw.data_vencimento,
      confirmado: Boolean(raw.confirmado),
    });
  } else if (Array.isArray(raw.financeiro_parcelas) && raw.financeiro_parcelas.length > 0) {
    for (const p of raw.financeiro_parcelas) {
      parcelas.push({
        parcela: Number(p.parcela || 1),
        total_parcelas: Number(p.total_parcelas || raw.financeiro_parcelas.length),
        documento: p.documento || raw.numero_documento,
        valor: Number(p.valor || valorTotal),
        data_vencimento: p.data_vencimento,
        confirmado: Boolean(p.confirmado),
      });
    }
  } else if (raw.parcela) {
    parcelas.push({
      parcela: Number(raw.parcela || 1),
      total_parcelas: Number(raw.total_parcelas || 1),
      documento: raw.numero_documento,
      valor: valorTotal,
      data_vencimento: raw.data_vencimento,
      confirmado: Boolean(raw.confirmado),
    });
  }

  return {
    id: Number(raw.id || 0),
    numero: numeroVenda,
    codigo: raw.numero_documento || (mv?.modelo ? `${mv.modelo} - ${numeroVenda}` : null),
    data_emissao: dataCriacao,
    data_criacao: dataCriacao,
    data_faturamento: mv?.data_confirmacao || raw.data_confirmacao || null,
    status,
    confirmado,
    valor_total: valorTotal,
    valor_desconto: Number(raw.valor_desconto || 0),
    cliente_id: raw.entidade?.id ?? null,
    cliente_nome: clienteNome,
    cliente_documento: clienteDoc,
    vendedor_id: vendedorId,
    vendedor_nome: vendedorNome,
    funcionario_nome: raw.funcionario?.nome || null,
    departamento_nome: raw.departamento?.descricao || raw.departamento?.nome || null,
    conta_bancaria_nome: raw.conta_bancaria?.nome || null,
    categoria_nome: raw.plano_orcamentario?.nome || null,
    numero_documento: raw.numero_documento || null,
    modelo: mv?.modelo ? `${mv.modelo} - Venda Simples` : (raw.numero_sigla_movimentacao_vinculada || "Venda Simples Direta"),
    parcelas,
    forma_pagamento_nome:
      raw.forma_pagamento?.descricao ||
      raw.forma_pagamento?.nome ||
      null,
    observacoes: raw.observacoes || raw.descricao || null,
    itens: [
      {
        descricao: raw.plano_orcamentario?.nome
          ? `Produto / Serviço (${raw.plano_orcamentario.nome})`
          : `Venda Simples Direta #${numeroVenda}`,
        quantidade: 1,
        valor_unitario: valorTotal,
        valor_total: valorTotal,
      },
    ],
  };
}

export function mapTagPlusRawToPedido(raw: any): PedidoVenda {
  const dataHoje = new Date().toISOString().slice(0, 10);
  const dataEmissao = raw.data_criacao || raw.data_emissao || raw.data || raw.criado_em || dataHoje;

  const rawStatus = String(raw.status || raw.situacao || "").toUpperCase();
  // No TagPlus:
  // 'B' = Confirmado (possui data_confirmacao preenchida)
  // 'C' = Cancelado
  // 'A' = Aberto / Em andamento
  const rawConfirmado = Boolean(
    rawStatus === "B" ||
      Boolean(raw.data_confirmacao) ||
      raw.confirmado ||
      rawStatus === "CONFIRMADO" ||
      rawStatus === "FATURADO"
  );

  let status: StatusPedidoVenda = "aberto";
  if (rawStatus === "C" || rawStatus === "CANCELADO") {
    status = "cancelado";
  } else if (rawConfirmado) {
    status = "confirmado";
  } else {
    status = "aberto";
  }

  const itensRaw = normalizeArray(raw.itens || raw.produtos || []);
  const itens: ItemPedidoVenda[] = itensRaw.map((it: any) => {
    const qtd = Number(it.qtd ?? it.quantidade ?? 1);
    const vUnit = Number(it.valor_unitario ?? it.valor ?? it.preco ?? 0);
    const vDesc = Number(it.valor_desconto ?? it.desconto ?? 0);
    const vTotal = Number(it.valor_total ?? qtd * vUnit - vDesc);
    return {
      id: it.id,
      descricao: it.descricao || it.nome || it.produto?.descricao || "Item sem descrição",
      codigo: it.codigo || it.produto?.codigo || null,
      quantidade: qtd,
      valor_unitario: vUnit,
      valor_desconto: vDesc,
      valor_total: vTotal,
    };
  });

  const clienteNome =
    raw.cliente?.razao_social ||
    raw.cliente?.nome_fantasia ||
    raw.cliente?.nome ||
    raw.cliente_nome ||
    raw.contato?.nome ||
    "Cliente não identificado";

  const clienteDoc =
    raw.cliente?.cnpj ||
    raw.cliente?.cpf ||
    raw.cliente?.cnpj_cpf ||
    raw.cliente_documento ||
    null;

  const vendedorNome =
    raw.vendedor?.nome ||
    raw.funcionario?.nome ||
    raw.usuario?.nome ||
    raw.vendedor_nome ||
    raw.responsavel?.nome ||
    null;

  const vendedorId =
    raw.vendedor?.id ??
    raw.funcionario?.id ??
    raw.usuario_id ??
    raw.vendedor_id ??
    null;

  const valorTotal = Number(
    raw.valor_total ??
      raw.total ??
      raw.valor_bruto ??
      itens.reduce((acc, it) => acc + it.valor_total, 0)
  );

  return {
    id: Number(raw.id || raw.numero || 0),
    numero: raw.numero || raw.codigo || raw.id,
    codigo: raw.codigo ? String(raw.codigo) : null,
    data_emissao: dataEmissao,
    data_criacao: raw.criado_em || raw.created_at || dataEmissao,
    data_faturamento: raw.data_faturamento || raw.faturado_em || null,
    status,
    confirmado: rawConfirmado,
    valor_total: valorTotal,
    valor_desconto: Number(raw.valor_desconto || raw.desconto || 0),
    cliente_id: raw.cliente?.id ?? raw.cliente_id ?? null,
    cliente_nome: clienteNome,
    cliente_documento: clienteDoc,
    vendedor_id: vendedorId,
    vendedor_nome: vendedorNome,
    forma_pagamento_nome:
      raw.forma_pagamento?.nome ||
      raw.forma_pagamento_nome ||
      raw.condicao_pagamento?.nome ||
      null,
    observacoes: raw.observacoes || raw.observacao || null,
    itens,
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

  async buscarPedidos(params: FiltrosPedidosVenda): Promise<{
    items: PedidoVenda[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    // Busca as Vendas Simples registradas no TagPlus através do fluxo financeiro de entradas (Tipo E)
    // Onde a numeração oficial é a série 32xxxx
    const queryParams: Record<string, any> = {
      sort: "-id",
      per_page: params.limit || 50,
      page: params.page || 1,
      tipo: "E",
      fields: "*",
    };

    const headers: Record<string, string> = {};

    // Aplica o filtro de data correto no TagPlus via X-Data-Filter: data_lancamento
    if (params.data_inicio || params.data_fim) {
      headers["X-Data-Filter"] = "data_lancamento";
      const inicio = params.data_inicio || params.data_fim;
      const fim = params.data_fim || params.data_inicio;
      queryParams["since"] = `${inicio} 00:00:00`;
      queryParams["until"] = `${fim} 23:59:59`;
    }

    if (params.q) {
      queryParams["q"] = params.q;
    }

    const resp = await this.requestWithRateLimit<unknown>({
      method: "get",
      url: "/financeiros",
      params: queryParams,
      headers,
    });

    const rawItems = normalizeArray(resp.data);
    const items = rawItems
      .filter((raw: any) => isTagPlusVendaSimples(raw) || !raw.descricao)
      .map(mapFinanceiroToVendaSimples);

    const total = Number(resp.headers["x-total-items"] ?? resp.headers["x-total-count"] ?? 0) || items.length;
    const totalPages = Number(resp.headers["x-total-pages"] ?? 1) || 1;
    const page = params.page ?? 1;

    return { items, total, page, totalPages };
  }

  async buscarPedidoPorId(id: number): Promise<PedidoVenda> {
    const resp = await this.requestWithRateLimit<any>({
      method: "get",
      url: `/financeiros/${id}`,
      params: { fields: "*" },
    });
    const pedido = mapFinanceiroToVendaSimples(resp.data);
    const raw = resp.data;

    // 1. Tenta enriquecer com dados completos do Cliente (telefone, email, endereço)
    if (pedido.cliente_id) {
      try {
        const cResp = await this.requestWithRateLimit<any>({
          method: "get",
          url: `/clientes/${pedido.cliente_id}`,
        });
        const cData = cResp.data;
        if (cData) {
          if (cData.telefone) pedido.cliente_telefone = String(cData.telefone);
          if (cData.email) pedido.cliente_email = String(cData.email);
          if (Array.isArray(cData.enderecos) && cData.enderecos.length > 0) {
            const end = cData.enderecos[0];
            const rua = end.logradouro || end.endereco || "";
            const num = end.numero ? `, ${end.numero}` : "";
            const compl = end.complemento ? ` - ${end.complemento}` : "";
            const bairro = end.bairro ? ` - ${end.bairro}` : "";
            const cidade = end.cidade ? `, ${end.cidade}` : "";
            const uf = end.uf || end.estado ? `/${end.uf || end.estado}` : "";
            const cep = end.cep ? ` - CEP: ${end.cep}` : "";
            const formatted = `${rua}${num}${compl}${bairro}${cidade}${uf}${cep}`.trim();
            if (formatted) pedido.cliente_endereco = formatted;
          }
        }
      } catch (cErr) {
        // Ignora silenciosamente se a consulta do cliente falhar
      }
    }

    // 2. Tenta buscar os itens detalhados da venda via /vendas_simples/:id_movimentacao se o escopo permitir
    const idMovimentacao = raw.movimentacao_vinculada?.id_movimentacao;
    if (idMovimentacao) {
      try {
        const vsResp = await this.requestWithRateLimit<any>({
          method: "get",
          url: `/vendas_simples/${idMovimentacao}`,
        });
        if (vsResp.data && Array.isArray(vsResp.data.itens) && vsResp.data.itens.length > 0) {
          pedido.itens = vsResp.data.itens.map((it: any) => ({
            id: it.id,
            descricao: it.descricao || it.produto_servico?.descricao || it.produto?.descricao || "Produto / Serviço",
            codigo: it.codigo || it.produto_servico?.codigo || it.produto?.codigo || null,
            quantidade: Number(it.qtd ?? it.quantidade ?? 1),
            valor_unitario: Number(it.valor_unitario ?? it.vr_unitario ?? 0),
            valor_desconto: Number(it.valor_desconto ?? 0),
            valor_total: Number(it.valor_total ?? it.valor_subtotal ?? 0),
          }));
        }
      } catch (vsErr) {
        // Ignora silenciosamente se o escopo read:vendas_simples ainda não estiver disponível
      }
    }

    // 3. Se ainda não possui itens detalhados, tenta buscar pedidos/orçamentos com numeração vinculada
    if (!pedido.itens || pedido.itens.length <= 1) {
      try {
        const pedResp = await this.requestWithRateLimit<any>({
          method: "get",
          url: "/pedidos",
          params: { q: String(pedido.numero), fields: "*" },
        });
        const pList = normalizeArray(pedResp.data) as any[];
        const matchPed: any = pList.find(
          (p: any) =>
            String(p.numero) === String(pedido.numero) &&
            Array.isArray(p.itens) &&
            p.itens.length > 0
        );
        if (matchPed && Array.isArray(matchPed.itens) && matchPed.itens.length > 0) {
          pedido.itens = matchPed.itens.map((it: any) => ({
            id: it.id,
            descricao:
              it.produto_servico?.descricao ||
              it.descricao ||
              it.detalhes ||
              "Produto / Serviço",
            codigo: it.produto_servico?.codigo || it.codigo || null,
            quantidade: Number(it.qtd ?? it.quantidade ?? 1),
            valor_unitario: Number(it.valor_unitario ?? 0),
            valor_desconto: Number(it.valor_desconto ?? 0),
            valor_total: Number(it.valor_subtotal ?? it.valor_total ?? 0),
          }));
          if (matchPed.observacoes) {
            pedido.observacoes = `${matchPed.observacoes}\n\n${pedido.observacoes || ""}`.trim();
          }
        }
      } catch {
        // Ignora busca de pedidos vinculados
      }
    }

    return pedido;
  }

  async buscarVendedores(): Promise<VendedorTagPlus[]> {
    try {
      const resp = await this.requestWithRateLimit<unknown>({
        method: "get",
        url: "/financeiros",
        params: { per_page: 100, sort: "-id", tipo: "E", fields: "*" },
      });
      const raw = normalizeArray(resp.data);
      const mapVendedores = new Map<number, VendedorTagPlus>();

      for (const f of raw as any[]) {
        const func = f.funcionario_responsavel || f.funcionario;
        if (func && func.id && func.nome) {
          mapVendedores.set(Number(func.id), {
            id: Number(func.id),
            nome: String(func.nome),
            email: null,
            ativo: true,
          });
        }
      }

      return Array.from(mapVendedores.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome)
      );
    } catch {
      return [];
    }
  }
}
