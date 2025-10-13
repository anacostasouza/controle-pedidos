import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";

admin.initializeApp();

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
  if (!nomeCliente || !tipoAtendimento) {
    res.status(400).send("Nome do cliente e tipo de atendimento são obrigatórios.");
    return;
  }
  try {
    const docRef = await admin.firestore().collection("atendimentos").add({
      nomeCliente,
      tipoAtendimento,
      status: "Aguardando",
      prioridade,
      criadoEm: new Date().toISOString(), 
      historico: [
        {
          status: "Aguardando",
          data: new Date().toISOString(), 
        },
      ],
    });
    res.status(201).send({ id: docRef.id });
  } catch (error) {
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
  const { status, atendente } = req.body;
  if (!status) {
    res.status(400).send("Status é obrigatório.");
    return;
  }
  try {
    const atendimentoRef = admin.firestore().collection("atendimentos").doc(atendimentoId);
    const docSnap = await atendimentoRef.get();
    const data = docSnap.data();

    // Monta updateData normalmente
    const updateData: any = {
      status,
      historico: admin.firestore.FieldValue.arrayUnion({
        status,
        data: new Date().toISOString(),
      }),
    };
    if (status === "Em Atendimento" && atendente) {
      updateData.atendente = atendente;
    }

    // Se finalizando, calcula e salva os tempos
    if (
      ["Finalizado", "Cancelado", "Adicionado ao controle de pedidos"].includes(status) &&
      data
    ) {
      // Tempo de espera: diferença entre início (criadoEm) e primeiro "Em Atendimento"
      let tempoEspera: number | null = null;
      let tempoAtendimento: number | null = null;
      const historico = Array.isArray(data.historico) ? data.historico : [];
      const criadoEm = new Date(data.criadoEm);
      const emAtendimento = historico.find((h: any) => h.status === "Em Atendimento");
      if (emAtendimento) {
        const inicioAtendimento = new Date(emAtendimento.data);
        tempoEspera = Math.floor((inicioAtendimento.getTime() - criadoEm.getTime()) / 1000); // segundos
        // Tempo de atendimento: diferença entre início do atendimento e agora
        tempoAtendimento = Math.floor((Date.now() - inicioAtendimento.getTime()) / 1000); // segundos
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
    const atendimentos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
    const atendimento = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

    const atendimentosRef = admin.firestore().collection("atendimentos");
    const snapshot = await atendimentosRef
      .where("criadoEm", ">=", inicioDate.toISOString())
      .where("criadoEm", "<=", fimDate.toISOString())
      .get();

    const atendimentos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(atendimentos);
    return;
  } catch (error) {
    console.error("Erro ao buscar atendimentos por período:", error);
    res.status(500).send("Erro interno ao buscar atendimentos por período.");
    return;
  }
});

// Função para converter segundos em formato HH:MM:SS
function segundosParaHHMMSS(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// Exporta a função HTTP
export const api = functions.https.onRequest(app);


