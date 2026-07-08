import express from "express";
import { logError } from "../../../utils/logger";
import { TagPlusClient } from "../../../tagplus/TagPlusClient";
import {
  ensureTagPlusAccessToken,
  mapTagPlusClienteParaLegacy,
} from "../../../tagplus/tagplusShared";

function extrairTermoBusca(clientesFiltro: any[]): string {
  const primeiro = clientesFiltro?.[0] || {};
  const razaoSocial = String(primeiro.razao_social || "").trim();
  const cnpjCpf = String(primeiro.cnpj_cpf || "").replace(/\D/g, "");

  if (!razaoSocial && !cnpjCpf) {
    return "";
  }

  if (cnpjCpf) {
    return cnpjCpf;
  }

  const razaoSocialNormalizada = razaoSocial.replace(/\D/g, "");
  if (/^\d{11}$|^\d{14}$/.test(razaoSocialNormalizada)) {
    return razaoSocialNormalizada;
  }

  return razaoSocial;
}

async function buscarClientesTagPlus(termoBusca: string, accessToken: string) {
  const client = new TagPlusClient({ accessToken });
  return client.buscarClientesPorTermo(termoBusca);
}

export function createProtectedTagPlusRouter(): express.Router {
  const router = express.Router();

  router.post("/tagplus/buscarCliente", async (req, res) => {
    try {
      const { clientesFiltro } = req.body;

      if (!clientesFiltro || !Array.isArray(clientesFiltro)) {
        return res.status(400).json({ message: "Parâmetros de busca inválidos" });
      }

      const termoBusca = extrairTermoBusca(clientesFiltro);
      if (!termoBusca) {
        return res.status(400).json({ message: "Nome do cliente ou CPF/CNPJ é obrigatório" });
      }

      const storedTokens = await ensureTagPlusAccessToken();
      const accessToken = process.env.TAGPLUS_ACCESS_TOKEN || storedTokens?.access_token || "";

      if (!accessToken) {
        return res.status(500).json({ message: "TAGPLUS_ACCESS_TOKEN not configured" });
      }

      const responder = async (token: string) => {
        const resultado = await buscarClientesTagPlus(termoBusca, token);
        const clientes = (resultado?.clientes || [])
          .map((cliente: any) => mapTagPlusClienteParaLegacy(cliente))
          .filter(Boolean);

        if (clientes.length > 0) {
          return res.status(200).json({
            clientes,
          });
        }

        return res.status(404).json({ message: "Cliente não encontrado" });
      };

      try {
        return await responder(accessToken);
      } catch (error) {
        const refreshedTokens = await ensureTagPlusAccessToken({ forceRefresh: true });
        const refreshedAccessToken = process.env.TAGPLUS_ACCESS_TOKEN || refreshedTokens?.access_token || "";

        if (!refreshedAccessToken) {
          throw error;
        }

        return await responder(refreshedAccessToken);
      }
    } catch (error) {
      logError(
        "Erro ao buscar cliente na TagPlus:",
        error instanceof Error ? error.message : "Erro desconhecido"
      );
      return res.status(500).json({ message: "Erro ao buscar cliente na TagPlus" });
    }
  });

  return router;
}
