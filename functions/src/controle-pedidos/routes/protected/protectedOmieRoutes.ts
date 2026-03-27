import express from "express";
import axios from "axios";
import { logError } from "../../../utils/logger";
import { getOmieRuntimeConfig } from "../../../config/runtimeParams";

function mascararTelefone(ddd: string, numero: string): string {
  if (!numero) return "";
  const ultimos4 = numero.slice(-4);
  return `(${ddd}) ****-${ultimos4}`;
}

function mascararCpfCnpj(cnpj_cpf: string): string {
  if (!cnpj_cpf) return "";
  const tamanho = cnpj_cpf.length;
  if (tamanho <= 14) {
    return `***.***.***-${cnpj_cpf.slice(-2)}`;
  } else if (tamanho >= 15) {
    return `**.***.***/****-${cnpj_cpf.slice(-4)}`;
  }
  return cnpj_cpf;
}

async function buscarClienteOmie(nomeCliente: string, cnpj_cpf?: string) {
  const { appKey, appSecret, baseUrlClients } = getOmieRuntimeConfig();

  const clientesFiltro = [];

  if (cnpj_cpf) {
    clientesFiltro.push({
      razao_social: "",
      cnpj_cpf,
      inativo: "N",
    });
  } else if (nomeCliente && /^\d{11,14}$/.test(nomeCliente.replace(/\D/g, ""))) {
    clientesFiltro.push({
      razao_social: "",
      cnpj_cpf: nomeCliente.replace(/\D/g, ""),
      inativo: "N",
    });
  } else {
    clientesFiltro.push({
      razao_social: nomeCliente,
      cnpj_cpf: "",
      inativo: "N",
    });
  }

  const payload = {
    call: "ListarClientes",
    app_key: appKey,
    app_secret: appSecret,
    param: [
      {
        pagina: 1,
        registros_por_pagina: 50,
        apenas_importado_api: "N",
        clientesFiltro,
      },
    ],
  };

  if (!baseUrlClients) {
    throw new Error("OMIE_BASE_URL_CLIENTS environment variable is not set");
  }

  const { data } = await axios.post(baseUrlClients, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 20000,
  });

  return data;
}

export function createProtectedOmieRouter(): express.Router {
  const router = express.Router();

  router.post("/omie/buscarClientes", async (req, res) => {
    try {
      const { clientesFiltro } = req.body;

      if (!clientesFiltro || !Array.isArray(clientesFiltro)) {
        return res.status(400).json({ message: "Parâmetros de busca inválidos" });
      }

      const { razao_social, cnpj_cpf } = clientesFiltro[0];

      if (!razao_social && !cnpj_cpf) {
        return res.status(400).json({ message: "Nome do cliente ou CPF/CNPJ é obrigatório" });
      }

      let termoBusca = razao_social;
      let cpfCnpj = cnpj_cpf;

      if (!razao_social && cpfCnpj) {
        cpfCnpj = cpfCnpj.replace(/\D/g, "");
      } else if (razao_social && /^\d+$/.test(razao_social.replace(/\D/g, ""))) {
        cpfCnpj = razao_social.replace(/\D/g, "");
        termoBusca = "";
      }

      const resultadoBusca = await buscarClienteOmie(termoBusca, cpfCnpj);
      const clientes = resultadoBusca?.clientes_cadastro || [];

      if (clientes.length > 0) {
        return res.status(200).json({
          clientes: clientes.map((cli: any) => ({
            codigo_cliente_omie: cli.codigo_cliente_omie,
            nome: cli.razao_social,
            cnpj_cpf: mascararCpfCnpj(cli.cnpj_cpf),
            telefone: mascararTelefone(cli.telefone1_ddd, cli.telefone1_numero),
          })),
        });
      }

      return res.status(404).json({ message: "Cliente não encontrado" });
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
        return res.status(504).json({ message: "Tempo limite excedido ao buscar cliente na Omie" });
      }
      logError("Erro ao buscar cliente Omie:", error instanceof Error ? error.message : "Erro desconhecido");
      return res.status(500).json({ message: "Erro ao buscar cliente Omie" });
    }
  });

  return router;
}
