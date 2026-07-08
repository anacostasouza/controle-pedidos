import axios, { AxiosInstance } from "axios";

export interface TagPlusClientOptions {
  baseUrl?: string;
  accessToken?: string;
}

export interface TagPlusClienteResumo {
  id?: string | number;
  codigo_cliente?: string | number;
  codigo_cliente_omie?: string | number;
  nome?: string;
  razao_social?: string;
  nome_fantasia?: string;
  fantasia?: string;
  cnpj?: string;
  cpf?: string;
  cnpj_cpf?: string;
  telefone?: string;
  telefone1_numero?: string;
  telefone1_ddd?: string;
  email?: string;
  ativo?: boolean | string | number;
  [key: string]: any;
}

export class TagPlusClient {
  private axios: AxiosInstance;

  constructor(options: TagPlusClientOptions = {}) {
    const baseURL = options.baseUrl || "https://api.tagplus.com.br";
    this.axios = axios.create({
      baseURL,
      headers: {
        "X-Api-Version": "2.0",
        "Content-Type": "application/json",
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      timeout: 10000,
    });
  }

  async request(method: "get" | "post" | "put" | "patch" | "delete", path: string, params?: any, data?: any) {
    const resp = await this.axios.request({ method, url: path, params, data });
    return resp.data;
  }

  async buscarClientes(params?: Record<string, any>) {
    return this.request("get", "/clientes", params);
  }

  async buscarClientesPorTermo(termo: string) {
    const apenasNumeros = termo.replace(/\D/g, "");
    const ehCpfCnpj = /^(\d{11}|\d{14})$/.test(apenasNumeros);
    const query = ehCpfCnpj ? apenasNumeros : termo.trim();

    const resultado = await this.buscarClientes({
      q: query,
      fields: "*",
      per_page: 100,
      page: 1,
    });

    const clientes = Array.isArray(resultado?.clientes)
      ? resultado.clientes
      : Array.isArray(resultado?.data)
        ? resultado.data
        : Array.isArray(resultado)
          ? resultado
          : [];

    const normalizar = (valor: any) => String(valor ?? "").replace(/\D/g, "").toLowerCase();
    const normalizarTexto = (valor: any) => String(valor ?? "").trim().toLowerCase();

    if (!query) {
      return { clientes: [] as TagPlusClienteResumo[] };
    }

    const filtrados = clientes.filter((cliente: TagPlusClienteResumo) => {
      const camposTexto = [
        cliente.nome,
        cliente.razao_social,
        cliente.nome_fantasia,
        cliente.fantasia,
      ]
        .map(normalizarTexto)
        .filter(Boolean);

      const camposDocumento = [cliente.cnpj, cliente.cpf, cliente.cnpj_cpf].map(normalizar).filter(Boolean);

      if (ehCpfCnpj) {
        return camposDocumento.some((campo) => campo.includes(apenasNumeros));
      }

      const termoNormalizado = normalizarTexto(query);
      return camposTexto.some((campo) => campo.includes(termoNormalizado));
    });

    return { clientes: filtrados };
  }

  // outros helpers podem ser adicionados aqui (buscarProdutos, criarPedido, etc.)
}

export default TagPlusClient;
