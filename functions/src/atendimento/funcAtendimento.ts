import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import express from "express";
import axios from "axios";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

const app = express();

// Middleware para CORS
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  next();
});

// Rota pública (não exige autenticação)
app.post("/criarAtendimentoFila", async (req, res) => {
  const { nomeCliente, tipoAtendimento, prioridade } = req.body;
  if (!nomeCliente || !tipoAtendimento || !prioridade) {
    res
      .status(400)
      .send(
        "Nome do cliente, tipo de atendimento e prioridade são obrigatórios."
      );
    return;
  }
  try {
    const now = Timestamp.now();
    const docRef = await admin
      .firestore()
      .collection("atendimentos")
      .add({
        nomeCliente,
        tipoAtendimento,
        status: "Aguardando",
        prioridade,
        criadoEm: now,
        historico: [
          {
            status: "Aguardando",
            data: now,
          },
        ],
      });

    res.status(201).send({ id: docRef.id });
  } catch (error) {
    console.error("Erro ao criar atendimento:", error);
    res.status(500).send("Erro interno ao criar atendimento.");
  }
});

// Middleware de autenticação (protege as rotas abaixo)
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      (req as any).user = decodedToken;
      return next();
    } catch (err) {
      return res.status(401).send("Token inválido");
    }
  }
  return res.status(401).send("Não autenticado");
});

// Rota para adicionar um novo status ao histórico
app.post("/atualizarHistorico/:id", async (req, res) => {
  const atendimentoId = req.params.id;
  const { status, atendente, atendenteUid } = req.body;
  if (!status) {
    res.status(400).send("Status é obrigatório.");
    return;
  }
  try {
    const atendimentoRef = admin
      .firestore()
      .collection("atendimentos")
      .doc(atendimentoId);
    const docSnap = await atendimentoRef.get();
    const data = docSnap.data();

    // Monta updateData normalmente
    const updateData: any = {
      status,
      historico: FieldValue.arrayUnion({
        status,
        data: Timestamp.now(),
      }),
    };
    if (status === "Em Atendimento" && atendente) {
      updateData.atendente = atendente;
      updateData.atendenteUid = atendenteUid;
    }

    // Se finalizando, calcula e salva os tempos
    if (
      ["Finalizado", "Cancelado", "Adicionado ao controle de pedidos"].includes(
        status
      ) &&
      data
    ) {
      // Tempo de espera: diferença entre início (criadoEm) e primeiro "Em Atendimento"
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
    console.error("Erro ao atualizar histórico:", error);
    res.status(500).send("Erro interno ao atualizar histórico.");
  }
});

// Rota para listar atendimentos
app.get("/filaAtendimento", async (req, res) => {
  try {
    const atendimentosRef = admin.firestore().collection("atendimentos");
    const snapshot = await atendimentosRef.get();
    const atendimentos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).send(atendimentos);
  } catch (error) {
    res.status(500).send("Erro interno ao listar atendimentos.");
  }
});

// Rota para deletar atendimento
app.delete("/deletarAtendimento/:id", async (req, res) => {
  const atendimentoId = req.params.id;
  try {
    await admin
      .firestore()
      .collection("atendimentos")
      .doc(atendimentoId)
      .delete();
    res.status(200).send({ message: "Atendimento deletado com sucesso." });
  } catch (error) {
    res.status(500).send("Erro interno ao deletar atendimento.");
  }
});

// Função para buscar todos os atendimentos

app.get("/todosAtendimentos", async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection("atendimentos").get();
    const atendimento = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).send(atendimento);
  } catch (error) {
    res.status(500).send("Erro interno ao buscar atendimentos.");
  }
});

// Rota para buscar atendimentos por período
app.get("/atendimentosPorPeriodo", async (req, res) => {
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
  } catch (error) {
    console.error("Erro ao buscar atendimentos por período");
    res.status(500).send("Erro interno ao buscar atendimentos por período.");
    return;
  }
});

// Rota para registrar atendimento direto
app.post("/registrarAtendimento", async (req, res) => {
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
      criadoEm: Timestamp.now()
    })

    res.status(201).send({ atendimentoId: docRef.id });
  } catch (error) {
    console.error("Erro ao registrar atendimento direto:", error);
    res.status(500).send("Erro interno ao registrar atendimento direto.");
  }
});

// Função para converter segundos em formato HH:MM:SS
function segundosParaHHMMSS(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// Função para converter timestamp para Date
function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts.seconds !== undefined) return new Date(ts.seconds * 1000);
  if (typeof ts === "string" || ts instanceof Date) return new Date(ts);
  return null;
}

// ----------------------- FUNÇÕES OMIE -----------------------

async function buscarClienteOmie(nomeCliente: string, cnpj_cpf?: string) {
  const payload = {
    call: "ListarClientes",
    app_key: process.env.OMIE_APP_KEY,
    app_secret: process.env.OMIE_APP_SECRET,
    param: [
      {
        pagina: 1,
        registros_por_pagina: 50,
        apenas_importado_api: "N",
        clientesFiltro: [
          {
            razao_social: nomeCliente,
            cnpj_cpf: cnpj_cpf,
            inativo: "N",
          },
        ],
      },
    ],
  };

  const omieApiUrl = process.env.OMIE_BASE_URL_CLIENTS;
  if (!omieApiUrl) {
    throw new Error("Environment variable is not set.");
  }
  const { data } = await axios.post(omieApiUrl, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

// ------------------ ROTAS OMIE --------------

function mascararTelefone(ddd: string, numero: string): string {
  if (!numero) return "";
  const ultimos4 = numero.slice(-4);
  return `(${ddd}) ****-${ultimos4}`;
}

function mascararCpfCnpj(cnpj_cpf: string): string {
  if (!cnpj_cpf) return "";
  const tamanho = cnpj_cpf.length;
  if (tamanho <= 14) {
    // CPF
    return `***.***.***-${cnpj_cpf.slice(-2)}`;
  } else if (tamanho >= 15) {
    // CNPJ
    return `**.***.***/****-${cnpj_cpf.slice(-4)}`;
  }
  return cnpj_cpf;
}

app.post("/omie/buscarCliente", async (req, res) => {
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
    console.error("Erro ao buscar cliente Omie:", error);
    return res.status(500).send("Erro interno ao buscar cliente Omie.");
  }
});

export const atendimentoApi = functions.https.onRequest(
  { region: "southamerica-east1" },
  app
);
