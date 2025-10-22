import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import express from "express";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { deepConvertTimestamps } from "../utils/deepConvertTimestamps";
import { podeEditarPedidoBackend, podeEditarPrazoEntrega, podeEditarStatusArte, podeEditarStatusGalpao } from "../utils/permissaoUtils";
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
      pedidoID: "",
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
    const {
      pedidoID,
      novaDataEntrega,
      novoHorarioEntrega,
      novoStatusGeral,
      novoStatusArte,
      novoStatusGalpao,
      userInfo,
    } = req.body;

    // Busca o pedido
    const db = admin.firestore();
    const pedidoRef = db.collection("pedidos").doc(pedidoID);
    const pedidoSnap = await pedidoRef.get();

    if (!pedidoSnap.exists) {
      return res.status(404).json({ message: "Pedido não encontrado" });
    }

    // Adicione uma verificação explícita de tipo
    const pedido = pedidoSnap.data();
    if (!pedido) {
      return res.status(500).json({ message: "Erro ao obter dados do pedido" });
    }

    const currentUser = (req as any).user;
    
    const updateData: any = {};

    // Verificações específicas para cada tipo de operação
    const podeEditarPrazo = podeEditarPrazoEntrega(pedido, currentUser);
    const podeEditarStatus = podeEditarPedidoBackend(pedido, currentUser);
    const podeEditarArte = podeEditarStatusArte(pedido, currentUser);
    const podeEditarGalpao = podeEditarStatusGalpao(pedido, currentUser);

    // Verificar cada operação individualmente
    if (novaDataEntrega && !podeEditarPrazo) {
      return res.status(403).json({
        message: "Sem permissão para realizar esta operação",
        details: "Você não tem permissão para alterar a data de entrega."
      });
    }

    if (novoStatusGeral && novoStatusGeral !== pedido.statusAtual && !podeEditarStatus) {
      return res.status(403).json({
        message: "Sem permissão para realizar esta operação",
        details: "Você não tem permissão para alterar o status geral."
      });
    }

    // Verificar permissão para editar status de arte
    if (novoStatusArte !== undefined && !podeEditarArte) {
      return res.status(403).json({
        message: "Sem permissão para realizar esta operação",
        details: "Você não tem permissão para alterar o status da arte."
      });
    }

    // Verificar permissão para editar status de galpão
    if (novoStatusGalpao !== undefined && !podeEditarGalpao) {
      return res.status(403).json({
        message: "Sem permissão para realizar esta operação",
        details: "Você não tem permissão para alterar o status do galpão."
      });
    }

    // Se tem permissão para editar data/horário E está tentando editar esses campos
    if (podeEditarPrazo && novaDataEntrega) {
      // Converta a data de string para timestamp
      const [year, month, day] = novaDataEntrega.split("-").map(Number);
      const entregaDate = new Date(year, month - 1, day);

      // Correção: Use Timestamp do firebase-admin corretamente
      updateData["prazos.entrega"] = Timestamp.fromDate(entregaDate);
      updateData.horarioRetirada = novoHorarioEntrega || "08:00";
    }

    // Se tem permissão para editar status E está tentando editar algum status
    if (
      podeEditarStatus &&
      (novoStatusGeral !== undefined ||
        novoStatusArte !== undefined ||
        novoStatusGalpao !== undefined)
    ) {
      const now = Timestamp.now();

      // Atualizar status geral
      if (
        novoStatusGeral !== undefined &&
        novoStatusGeral !== pedido.statusAtual
      ) {
        updateData.statusAtual = novoStatusGeral;

        // Adicionar ao histórico
        updateData.historicoStatus = FieldValue.arrayUnion({
          status: novoStatusGeral,
          data: now,
          responsavel: userInfo?.userDisplayName || "Sistema",
          setor: userInfo?.userSetor || "SISTEMA",
        });

        // Se for "Concluído", atualizar também StatusArte e StatusGalpao
        if (novoStatusGeral === "Concluído") {
          if (pedido.requerArte) {
            updateData.StatusArte = FieldValue.arrayUnion({
              status: "Concluído",
              data: now,
              responsavel: userInfo?.userDisplayName || "Sistema",
            });
          }

          if (pedido.requerGalpao) {
            updateData.StatusGalpao = FieldValue.arrayUnion({
              status: "Concluído",
              data: now,
              responsavel: userInfo?.userDisplayName || "Sistema",
            });
          }
        }
      }

      // Atualizar status arte
      if (novoStatusArte !== undefined && pedido.requerArte) {
        const ultimoStatusArte =
          pedido.StatusArte && pedido.StatusArte.length > 0
            ? pedido.StatusArte[pedido.StatusArte.length - 1].status
            : null;

        if (novoStatusArte !== ultimoStatusArte) {
          updateData.StatusArte = FieldValue.arrayUnion({
            status: novoStatusArte,
            data: now,
            responsavel: userInfo?.userDisplayName || "Sistema",
          });
        }
      }

      // Atualizar status galpão
      if (novoStatusGalpao !== undefined && pedido.requerGalpao) {
        const ultimoStatusGalpao =
          pedido.StatusGalpao && pedido.StatusGalpao.length > 0
            ? pedido.StatusGalpao[pedido.StatusGalpao.length - 1].status
            : null;

        if (novoStatusGalpao !== ultimoStatusGalpao) {
          updateData.StatusGalpao = FieldValue.arrayUnion({
            status: novoStatusGalpao,
            data: now,
            responsavel: userInfo?.userDisplayName || "Sistema",
          });
        }
      }
    }

    // Se não há nada para atualizar
    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ message: "Nenhum dado válido para atualização" });
    }

    // Atualiza o pedido
    await pedidoRef.update(updateData);

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
      } catch (err) {
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
      const inicio = new Date(`${req.query.dataInicioRetirada}T00:00:00.000Z`);
      queryRef = queryRef.where(
        "prazos.entrega",
        ">=",
        Timestamp.fromDate(inicio)
      );
    }
    if (req.query.dataFimRetirada) {
      const fim = new Date(`${req.query.dataFimRetirada}T23:59:59.999Z`);
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

// Função auxiliar para mascarar dados
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

// Função para buscar cliente no Omie
async function buscarClienteOmie(nomeCliente: string, cnpj_cpf?: string) {
  // Prepara clientesFiltro considerando se o input é um CPF/CNPJ
  const clientesFiltro = [];
  
  // Se o cnpj_cpf foi passado diretamente
  if (cnpj_cpf) {
    clientesFiltro.push({
      razao_social: "",
      cnpj_cpf,
      inativo: "N",
    });
  } 
  // Se o nomeCliente parece ser um CPF/CNPJ (só números)
  else if (nomeCliente && /^\d{11,14}$/.test(nomeCliente.replace(/\D/g, ''))) {
    clientesFiltro.push({
      razao_social: "",
      cnpj_cpf: nomeCliente.replace(/\D/g, ''),
      inativo: "N",
    });
  } 
  // Caso contrário, busca por nome
  else {
    clientesFiltro.push({
      razao_social: nomeCliente,
      cnpj_cpf: "",
      inativo: "N",
    });
  }

  const payload = {
    call: "ListarClientes",
    app_key: process.env.OMIE_APP_KEY,
    app_secret: process.env.OMIE_APP_SECRET,
    param: [
      {
        pagina: 1,
        registros_por_pagina: 50,
        apenas_importado_api: "N",
        clientesFiltro,
      },
    ],
  };

  const omieApiUrl = process.env.OMIE_BASE_URL_CLIENTS;
  if (!omieApiUrl) {
    throw new Error("OMIE_BASE_URL_CLIENTS environment variable is not set");
  }
  
  const axios = require('axios');
  const { data } = await axios.post(omieApiUrl, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

// Modifique a rota para buscar cliente para aceitar tanto nome quanto CPF/CNPJ
app.post("/omie/buscarClientes", async (req, res) => {
  try {
    const { clientesFiltro } = req.body;
    
    if (!clientesFiltro || !Array.isArray(clientesFiltro)) {
      return res.status(400).json({ message: "Parâmetros de busca inválidos" });
    }
    
    const { razao_social, cnpj_cpf } = clientesFiltro[0];
    
    // Se não tem nome nem CPF/CNPJ, retorna erro
    if (!razao_social && !cnpj_cpf) {
      return res.status(400).json({ message: "Nome do cliente ou CPF/CNPJ é obrigatório" });
    }

    // Se tem apenas números, trata como CPF/CNPJ
    let termoBusca = razao_social;
    let cpfCnpj = cnpj_cpf;
    
    if (!razao_social && cpfCnpj) {
      // É uma busca por CPF/CNPJ
      cpfCnpj = cpfCnpj.replace(/\D/g, '');
    } else if (razao_social && /^\d+$/.test(razao_social.replace(/\D/g, ''))) {
      // O campo razao_social contém apenas números, trata como CPF/CNPJ
      cpfCnpj = razao_social.replace(/\D/g, '');
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
    console.error("Erro ao buscar cliente Omie:", error);
    return res.status(500).json({ message: "Erro ao buscar cliente Omie" });
  }
});

export const controlePedidosApi = functions.https.onRequest(
  { region: "southamerica-east1" },
  app
);
