import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import express from "express";
import { Timestamp } from "firebase-admin/firestore";
import { deepConvertTimestamps } from "../utils/deepConvertTimestamps";
import { podeEditarPedidoBackend } from "../utils/permissaoUtils";
import { authMiddleware } from "../utils/authMiddleware";
import { aplicarFiltrosPedidos } from "./utils/filtrosUtils";

const app = express();
app.use(express.json());

// Middleware para CORS
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// Middleware de autenticação
app.use(authMiddleware);

// Rota para criar pedido
app.post("/dashboard/criarPedido", async (req, res) => {
  try {
    debugger;
    const {
      numeroPedido,
      nomeCliente,
      servico,
      responsavel,
      responsavelUid,
      setoresResponsaveis,
      statusAtual,
      historicoStatus,
      prazos,
      tipoDeEntrega,
      horarioRetirada,
      requerArte = false,
      StatusArte = [],
      requerGalpao = false,
      StatusGalpao = [],
      atendimentoId,
      origem,
      codigoClienteOmie,
      telefone,
      retrabalho,
    } = req.body;

    const nomeClienteUpper = nomeCliente ? nomeCliente.toUpperCase() : "";

    if (
      typeof numeroPedido !== "number" ||
      !nomeCliente ||
      !servico ||
      !servico.tipo ||
      typeof servico.servicoID !== "number" ||
      !responsavel ||
      !Array.isArray(setoresResponsaveis) ||
      !statusAtual ||
      !Array.isArray(historicoStatus) ||
      !prazos ||
      !prazos.entrega ||
      !tipoDeEntrega
    ) {
      return res
        .status(400)
        .json({ message: "Parâmetros obrigatórios ausentes ou inválidos" });
    }
    const db = admin.firestore();

    let requerGalpaoFinal = requerGalpao;
    let requerArteFinal = requerArte;

    if (servico.tipo === "COMUNICACAO_VISUAL") {
      if (
        servico.subTipo === "PLACA_SIMPLES" ||
        servico.subTipo === "PLACA_COMPLEXA"
      ) {
        requerGalpaoFinal = true;
      }
    }

    if (servico.tipo === "ARTE") {
      requerArteFinal = true;
    }

    const pedidoData = deepConvertTimestamps({
      pedidoID: 0,
      numeroPedido: Number(numeroPedido),
      nomeCliente: nomeClienteUpper,
      servico: {
        tipo: servico.tipo,
        subTipo: servico.subTipo || null,
        servicoID: Number(servico.servicoID),
      },
      responsavel,
      responsavelUid,
      retrabalho: !!retrabalho,
      requerArte: requerArteFinal,
      StatusArte,
      requerGalpao: requerGalpaoFinal,
      StatusGalpao,
      setoresResponsaveis,
      statusAtual,
      historicoStatus,
      prazos,
      horarioRetirada: horarioRetirada || null,
      tipoDeEntrega,
      atendimentoId: atendimentoId || null,
      origem: origem || null,
      codigoClienteOmie: codigoClienteOmie ? Number(codigoClienteOmie) : null,
      telefone: telefone || null,
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
      entregueEm: null,
    });

    const pedidoRef = await db.collection("pedidos").add(pedidoData);
    await pedidoRef.update({ pedidoID: pedidoRef.id });

    return res.status(201).json({ pedidoID: pedidoRef.id });
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    return res.status(500).json({ message: "Erro ao criar pedido" });
  }
});

// Rota para editar pedido
app.post("/dashboard/editarPedido", async (req, res) => {
  try {
    const { pedidoID, ...updateData } = req.body;

    if (!pedidoID) {
      return res
        .status(400)
        .json({ message: "Parâmetro obrigatório não preenchido" });
    }

    const db = admin.firestore();
    const pedidoRef = db.collection("pedidos").doc(pedidoID);

    const pedidoDoc = await pedidoRef.get();
    if (!pedidoDoc.exists) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }
    const pedido = pedidoDoc.data();

    if (!pedido || !podeEditarPedidoBackend(pedido, (req as any).user)) {
      return res
        .status(403)
        .json({ message: "Você não tem permissão para editar este pedido." });
    }

    const updateDataWithTimestamps = deepConvertTimestamps(updateData);
    await pedidoRef.update(updateDataWithTimestamps);

    return res.status(200).json({ message: "Pedido atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao editar pedido:", error);
    return res.status(500).json({ message: "Erro ao editar pedido" });
  }
});

// Rota para deletar pedido
app.delete("/dashboard/deletarPedido", async (req, res) => {
  try {
    const { pedidoID } = req.body;
    if (!pedidoID) {
      return res
        .status(400)
        .json({ message: "Parâmetro obrigatório não preenchido" });
    }
    const db = admin.firestore();
    const pedidoRef = db.collection("pedidos").doc(pedidoID);
    const pedidoDoc = await pedidoRef.get();
    if (!pedidoDoc.exists) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }
    await pedidoRef.delete();
    return res.status(200).json({ message: "Pedido deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar pedido:", error);
    return res.status(500).json({ message: "Erro ao deletar pedido" });
  }
});

// Rota eficiente para buscar pedidos paginados e filtrados
app.get("/dashboard/buscarPedidos", async (req, res) => {
  try {
    const db = admin.firestore();

    // Monta a query principal usando filtrosUtils
    let queryRef: FirebaseFirestore.Query = db.collection("pedidos");
    queryRef = aplicarFiltrosPedidos(queryRef, req.query);

    queryRef = queryRef.orderBy("prazos.entrega", "asc");


    // Paginação eficiente por cursor
    const { itensPorPagina = 20, lastEntrega } = req.query;
    if (lastEntrega && !isNaN(Number(lastEntrega))) {
      const lastTimestamp = Timestamp.fromMillis(Number(lastEntrega));
      queryRef = queryRef.startAfter(lastTimestamp);
    }
    queryRef = queryRef.limit(Number(itensPorPagina));

    try {
      const snapshot = await queryRef.get();
      const pedidos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];

      let nextLastEntrega: number | null = null;
      if (pedidos.length > 0 && pedidos[pedidos.length - 1].prazos?.entrega) {
        const entrega = pedidos[pedidos.length - 1].prazos.entrega;
        if (typeof entrega._seconds === "number") {
          nextLastEntrega = entrega._seconds * 1000;
        } else if (typeof entrega.seconds === "number") {
          nextLastEntrega = entrega.seconds * 1000;
        }
      }

      // Contagem total eficiente usando filtrosUtils
      let total: number | null = 0;
      try {
        let countRef: FirebaseFirestore.Query = db.collection("pedidos");
        countRef = aplicarFiltrosPedidos(countRef, req.query);

        // @ts-ignore
        const countSnap = await countRef.count().get();
        // @ts-ignore
        total = countSnap.data().count || 0;
        console.log("Contagem total de pedidos:", total);
      } catch (err) {
        console.error("Erro na contagem:", err);
        total = null;
      }

      return res.json({ pedidos, nextLastEntrega, total });
    } catch (error) {
      console.error("Erro ao executar query Firestore:", error);
      return res.status(500).json({ message: "Erro ao buscar pedidos" });
    }
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error, req.query);
    return res.status(500).json({ message: "Erro ao buscar pedidos" });
  }
});

app.post("/dashboard/marcarComoEntregue", async (req, res) => {
  try {
    const { pedidoID } = req.body;
    const db = admin.firestore();
    const pedidoRef = db.collection("pedidos").doc(pedidoID);
    const pedidoDoc = await pedidoRef.get();
    if (!pedidoDoc.exists) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }
    const pedido = pedidoDoc.data();

    if (!pedido || !podeEditarPedidoBackend(pedido, (req as any).user)) {
      return res.status(403).json({ message: "Você não tem permissão." });
    }
    if (pedido.statusAtual !== "Concluído") {
      return res.status(400).json({ message: "Apenas pedidos 'Concluído'." });
    }

    const now = Timestamp.now();
    await pedidoRef.update({
      statusAtual: "Entregue",
      entregueEm: now,
      atualizadoEm: now,
      historicoStatus: [
        ...(pedido.historicoStatus ?? []),
        { status: "Entregue", data: now },
      ],
    });

    return res.status(200).json({ message: "Pedido marcado como entregue!" });
  } catch (error) {
    console.error("Erro ao marcar como entregue:", error);
    return res.status(500).json({ message: "Erro ao marcar como entregue" });
  }
});

// ---------------------- Rotas para relatórios ----------------------

app.get("/relatorios/buscarPedidos", async (req, res) => {
  try {
    const db = admin.firestore();

    // Monta a query principal usando filtrosUtils
    let queryRef: FirebaseFirestore.Query = db.collection("pedidos");
    queryRef = aplicarFiltrosPedidos(queryRef, req.query);

    // Filtros de data de inclusão
    if (req.query.dataInicioInclusao) {
      queryRef = queryRef.where(
        "criadoEm",
        ">=",
        Timestamp.fromDate(new Date(String(req.query.dataInicioInclusao)))
      );
    }
    if (req.query.dataFimInclusao) {
      const fim = new Date(
        String(req.query.dataFimInclusao) + "T23:59:59.999Z"
      );
      queryRef = queryRef.where("criadoEm", "<=", Timestamp.fromDate(fim));
    }

    // Filtros de data de retirada
    if (req.query.dataInicioRetirada) {
      queryRef = queryRef.where(
        "prazos.entrega",
        ">=",
        Timestamp.fromDate(new Date(String(req.query.dataInicioRetirada)))
      );
    }
    if (req.query.dataFimRetirada) {
      const fim = new Date(String(req.query.dataFimRetirada));
      fim.setHours(23, 59, 59, 999);
      queryRef = queryRef.where(
        "prazos.entrega",
        "<=",
        Timestamp.fromDate(fim)
      );
    }

    // Filtros de serviço
    if (req.query.filtroTipo)
      queryRef = queryRef.where("servico.tipo", "==", req.query.filtroTipo);

    if (req.query.filtroSubTipo)
      queryRef = queryRef.where(
        "servico.subTipo",
        "==",
        req.query.filtroSubTipo
      );

    // Filtros de cliente ou código pedido
    if (req.query.filtroCliente) {
      if (/^\d+$/.test(String(req.query.filtroCliente))) {
        queryRef = queryRef.where(
          "numeroPedido",
          "==",
          Number(req.query.filtroCliente)
        );
      } else {
        queryRef = queryRef.where(
          "nomeCliente",
          "==",
          String(req.query.filtroCliente).toUpperCase()
        );
      }
    }

    // Filtro de responsável (UID)
    if (req.query.filtroResponsavelUid)
      queryRef = queryRef.where(
        "responsavelUid",
        "==",
        req.query.filtroResponsavelUid
      );

    // Paginação correta: ordene por campo + id
    queryRef = queryRef.orderBy("prazos.entrega", "asc");

    // Paginação eficiente por cursor
    const { itensPorPagina = 20, lastEntrega, lastId } = req.query;
    if (lastEntrega && !isNaN(Number(lastEntrega))) {
      const lastTimestamp = Timestamp.fromMillis(Number(lastEntrega));
      queryRef = queryRef.startAfter(lastTimestamp);
    }
    queryRef = queryRef.limit(Number(itensPorPagina));

    // Busca
    const snapshot = await queryRef.get();
    const pedidos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      criadoEm: doc.data().criadoEm ?? null,
      prazos: doc.data().prazos ?? {},
    }));

    // LOG: quantidade de pedidos retornados
    console.log(
      `[Relatórios] Filtros:`,
      req.query,
      `| Pedidos retornados:`,
      pedidos.length
    );

    // Cursor para próxima página
    let nextLastEntrega: number | null = null;
    let nextLastId: string | null = null;
    if (pedidos.length > 0 && pedidos[pedidos.length - 1].prazos?.entrega) {
      const entrega = pedidos[pedidos.length - 1].prazos.entrega;
      if (typeof entrega._seconds === "number") {
        nextLastEntrega = entrega._seconds * 1000;
      } else if (typeof entrega.seconds === "number") {
        nextLastEntrega = entrega.seconds * 1000;
      }
      nextLastId = pedidos[pedidos.length - 1].id;
    }

    // Contagem total (opcional)
    let total: number | null = 0;
    try {
      let countRef: FirebaseFirestore.Query = db.collection("pedidos");
      countRef = aplicarFiltrosPedidos(countRef, req.query);

      // Repita todos os filtros de data e serviço
      if (req.query.dataInicioInclusao) {
        countRef = countRef.where(
          "criadoEm",
          ">=",
          Timestamp.fromDate(new Date(String(req.query.dataInicioInclusao)))
        );
      }
      if (req.query.dataFimInclusao) {
        const fim = new Date(
          String(req.query.dataFimInclusao) + "T23:59:59.999Z"
        );
        countRef = countRef.where("criadoEm", "<=", Timestamp.fromDate(fim));
      }
      if (req.query.dataInicioRetirada) {
        countRef = countRef.where(
          "prazos.entrega",
          ">=",
          Timestamp.fromDate(new Date(String(req.query.dataInicioRetirada)))
        );
      }
      if (req.query.dataFimRetirada) {
        const fim = new Date(String(req.query.dataFimRetirada));
        fim.setHours(23, 59, 59, 999);
        countRef = countRef.where(
          "prazos.entrega",
          "<=",
          Timestamp.fromDate(fim)
        );
      }
      if (req.query.filtroTipo) {
        countRef = countRef.where("servico.tipo", "==", req.query.filtroTipo);
      }
      if (req.query.filtroSubTipo) {
        countRef = countRef.where(
          "servico.subTipo",
          "==",
          req.query.filtroSubTipo
        );
      }
      if (req.query.filtroCliente) {
        if (/^\d+$/.test(String(req.query.filtroCliente))) {
          countRef = countRef.where(
            "numeroPedido",
            "==",
            Number(req.query.filtroCliente)
          );
        } else {
          countRef = countRef.where(
            "nomeCliente",
            "==",
            String(req.query.filtroCliente).toUpperCase()
          );
        }
      }
      if (req.query.filtroResponsavelUid) {
        countRef = countRef.where(
          "responsavelUid",
          "==",
          req.query.filtroResponsavelUid
        );
      }

      // @ts-ignore
      const countSnap = await countRef.count().get();
      // @ts-ignore
      total = countSnap.data().count || 0;
    } catch (err) {
      console.error("Erro na contagem:", err);
      total = null;
    }

    return res.json({ pedidos, nextLastEntrega, nextLastId, total });
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error, req.query);
    return res.status(500).json({ message: "Erro ao buscar pedidos" });
  }
});

export const controlePedidosApi = functions.https.onRequest(
  { region: "southamerica-east1" },
  app
);
