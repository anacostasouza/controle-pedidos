import * as admin from "firebase-admin";
import axios from "axios";
import express from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  buscarAtendimentosComFiltros,
  validarFiltros,
} from "../../utils/filtrosUtils";
import { logError } from "../../../utils/logger";
import { getOmieRuntimeConfig } from "../../../config/runtimeParams";

function segundosParaHHMMSS(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts.seconds !== undefined) return new Date(ts.seconds * 1000);
  if (typeof ts === "string" || ts instanceof Date) return new Date(ts);
  return null;
}

async function buscarClienteOmie(nomeCliente: string, cnpj_cpf?: string) {
  const { appKey, appSecret, baseUrlClients } = getOmieRuntimeConfig();

  const payload = {
    call: "ListarClientes",
    app_key: appKey,
    app_secret: appSecret,
    param: [
      {
        pagina: 1,
        registros_por_pagina: 50,
        apenas_importado_api: "N",
        clientesFiltro: [
          {
            razao_social: nomeCliente,
            cnpj_cpf,
            inativo: "N",
          },
        ],
      },
    ],
  };

  if (!baseUrlClients) {
    throw new Error("Environment variable is not set.");
  }

  const { data } = await axios.post(baseUrlClients, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 20000,
  });
  return data;
}

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

export function createProtectedAtendimentoRouter(): express.Router {
  const router = express.Router();

  router.post("/atualizarHistorico/:id", async (req, res) => {
    const atendimentoId = req.params.id;
    const { status, atendente, atendenteUid, responsavel } = req.body;

    if (!status) {
      res.status(400).send("Status é obrigatório.");
      return;
    }

    if (!responsavel) {
      res.status(400).send("Responsável é obrigatório.");
      return;
    }

    if (status === "Em Atendimento" && atendenteUid) {
      try {
        await admin.auth().getUser(atendenteUid);
      } catch {
        res.status(400).send("atendenteUid inválido ou usuário não existe");
        return;
      }
    }

    try {
      const atendimentoRef = admin
        .firestore()
        .collection("atendimentos")
        .doc(atendimentoId);
      const docSnap = await atendimentoRef.get();
      const data = docSnap.data();

      const historicoItem: any = {
        status,
        data: Timestamp.now(),
        responsavel,
      };

      const updateData: any = {
        status,
        historico: FieldValue.arrayUnion(historicoItem),
      };

      if (status === "Em Atendimento" && atendente) {
        updateData.atendente = atendente;
        updateData.atendenteUid = atendenteUid;
      }

      if (
        ["Finalizado", "Cancelado", "Adicionado ao controle de pedidos"].includes(
          status
        ) &&
        data
      ) {
        let tempoEspera: number | null = null;
        let tempoAtendimento: number | null = null;
        const historico = Array.isArray(data.historico) ? data.historico : [];
        const criadoEm = toDate(data.criadoEm);
        const emAtendimento = historico.find((h: any) => h.status === "Em Atendimento");
        if (emAtendimento) {
          const inicioAtendimento = toDate(emAtendimento.data);
          if (criadoEm && inicioAtendimento) {
            tempoEspera = Math.floor(
              (inicioAtendimento.getTime() - criadoEm.getTime()) / 1000
            );
            tempoAtendimento = Math.floor(
              (Date.now() - inicioAtendimento.getTime()) / 1000
            );
          }
        }
        if (tempoEspera !== null) {
          updateData.tempoEspera = segundosParaHHMMSS(tempoEspera);
        }
        if (tempoAtendimento !== null) {
          updateData.tempoAtendimento = segundosParaHHMMSS(tempoAtendimento);
        }
      }

      await atendimentoRef.update(updateData);

      res.status(200).send({ message: "Histórico atualizado." });
    } catch (error) {
      logError(
        "Erro ao atualizar histórico:",
        error instanceof Error ? error.message : "Erro desconhecido"
      );
      res.status(500).send("Erro interno ao atualizar histórico.");
    }
  });

  router.get("/filaAtendimento", async (_req, res) => {
    try {
      const atendimentosRef = admin.firestore().collection("atendimentos");
      const snapshot = await atendimentosRef.get();
      const atendimentos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.status(200).send(atendimentos);
    } catch {
      res.status(500).send("Erro interno ao listar atendimentos.");
    }
  });

  router.delete("/deletarAtendimento/:id", async (req, res) => {
    const atendimentoId = req.params.id;
    try {
      await admin
        .firestore()
        .collection("atendimentos")
        .doc(atendimentoId)
        .delete();
      res.status(200).send({ message: "Atendimento deletado com sucesso." });
    } catch {
      res.status(500).send("Erro interno ao deletar atendimento.");
    }
  });

  router.get("/todosAtendimentos", async (_req, res) => {
    try {
      const snapshot = await admin.firestore().collection("atendimentos").get();
      const atendimento = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.status(200).send(atendimento);
    } catch {
      res.status(500).send("Erro interno ao buscar atendimentos.");
    }
  });

  router.get("/atendimentosPorPeriodo", async (req, res) => {
    try {
      const { inicio, fim } = req.query;
      if (!inicio || !fim) {
        res.status(400).send("Parâmetros 'inicio' e 'fim' são obrigatórios.");
        return;
      }
      const inicioDate = new Date(inicio as string);
      const fimDate = new Date(fim as string);
      fimDate.setHours(23, 59, 59, 999);

      const inicioTimestamp = Timestamp.fromDate(inicioDate);
      const fimTimestamp = Timestamp.fromDate(fimDate);

      const atendimentosRef = admin.firestore().collection("atendimentos");
      const snapshot = await atendimentosRef
        .where("criadoEm", ">=", inicioTimestamp)
        .where("criadoEm", "<=", fimTimestamp)
        .get();

      const atendimentos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.status(200).json(atendimentos);
      return;
    } catch {
      logError("Erro ao buscar atendimentos por período");
      res.status(500).send("Erro interno ao buscar atendimentos por período.");
      return;
    }
  });

  router.post("/registrarAtendimento", async (req, res) => {
    try {
      const atendimentoData = req.body;

      if (!atendimentoData.nomeCliente || !atendimentoData.tipoAtendimento) {
        res
          .status(400)
          .send("Nome do cliente e tipo de atendimento são obrigatórios.");
        return;
      }

      const docRef = await admin
        .firestore()
        .collection("atendimentos")
        .add({
          ...atendimentoData,
          criadoEm: Timestamp.now(),
        });

      res.status(201).send({ atendimentoId: docRef.id });
    } catch (error) {
      logError(
        "Erro ao registrar atendimento direto:",
        error instanceof Error ? error.message : "Erro desconhecido"
      );
      res.status(500).send("Erro interno ao registrar atendimento direto.");
    }
  });

  router.get("/historico", async (req, res) => {
    try {
      const validacao = validarFiltros(req.query);
      if (!validacao.valido) {
        res.status(400).send(validacao.erro);
        return;
      }

      const limitParam = Number(req.query.limit);
      const offsetParam = Number(req.query.offset);
      const limit = Number.isFinite(limitParam) ? limitParam : undefined;
      const offset = Number.isFinite(offsetParam) ? offsetParam : undefined;

      let consumidorBoolean: boolean | undefined = undefined;
      if (req.query.consumidor === "true") {
        consumidorBoolean = true;
      } else if (req.query.consumidor === "false") {
        consumidorBoolean = false;
      }

      const resultado = await buscarAtendimentosComFiltros({
        dataInicio: req.query.dataInicio as string,
        dataFim: req.query.dataFim as string,
        status: req.query.status as string | undefined,
        atendenteUid: req.query.atendenteUid as string | undefined,
        tipo: req.query.tipo as "direto" | "fila" | undefined,
        consumidor: consumidorBoolean,
        tipoAtendimento: req.query.tipoAtendimento as string | undefined,
        limit,
        offset,
      });

      res.status(200).json({
        total: resultado.total,
        filtrosAplicados: resultado.filtrosAplicados,
        estatisticas: resultado.estatisticas,
        atendimentos: resultado.atendimentos,
        temMais: resultado.temMais,
      });
    } catch (error: any) {
      logError(
        "Erro ao buscar histórico:",
        error instanceof Error ? error.message : "Erro desconhecido"
      );
      res.status(500).send(error.message || "Erro ao buscar histórico.");
    }
  });

  router.post("/omie/buscarCliente", async (req, res) => {
    const { clientesFiltro } = req.body;
    if (
      !clientesFiltro ||
      !Array.isArray(clientesFiltro) ||
      (!clientesFiltro[0]?.razao_social && !clientesFiltro[0]?.cnpj_cpf)
    ) {
      res.status(400).send("Nome do cliente ou CNPJ/CPF é obrigatório.");
      return;
    }
    const { razao_social, cnpj_cpf } = clientesFiltro[0];

    try {
      const resultadoBusca = await buscarClienteOmie(razao_social, cnpj_cpf);
      const clientes = resultadoBusca?.clientes_cadastro || [];
      if (clientes.length > 0) {
        return res.status(200).json({
          clientes: clientes.map((cli: any) => ({
            codigo_cliente_omie: cli.codigo_cliente_omie,
            nome: cli.razao_social,
            cnpj_cpf: mascararCpfCnpj(cli.cnpj_cpf),
            telefone: mascararTelefone(cli.telefone1_ddd, cli.telefone1_numero),
          })),
          criado: false,
        });
      }

      return res
        .status(404)
        .json({ message: "Cliente não encontrado.", criado: false });
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
        return res
          .status(504)
          .json({ message: "Tempo limite excedido ao buscar cliente na Omie" });
      }
      logError(
        "Erro ao buscar cliente Omie:",
        error instanceof Error ? error.message : "Erro desconhecido"
      );
      return res.status(500).send("Erro interno ao buscar cliente Omie.");
    }
  });

  return router;
}
