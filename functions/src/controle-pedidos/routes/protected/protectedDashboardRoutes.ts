import * as admin from "firebase-admin";
import express from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { deepConvertTimestamps } from "../../../utils/deepConvertTimestamps";
import {
  podeEditarPedidoBackend,
  podeEditarPrazoEntrega,
  podeEditarStatusArte,
  podeEditarStatusGalpao,
  podeMarcarEntregue,
} from "../../../utils/permissaoUtils";
import {
  extractTimestampMs,
  filtrarPedidosEmMemoria,
  normalizarTexto,
  ordenarPedidosPorEntrega,
} from "../../utils/filtrosUtils";
import { logError } from "../../../utils/logger";
import { createSetorMiddleware } from "../../../utils/authMiddleware";

function buildCandidatePedidosQuery(
  db: FirebaseFirestore.Firestore,
  reqQuery: any
): FirebaseFirestore.Query {
  const col = db.collection("pedidos");
  const termoCliente =
    typeof reqQuery.filtroCliente === "string" ? reqQuery.filtroCliente.trim() : "";

  if (termoCliente && /^\d+$/.test(termoCliente)) {
    return col.where("numeroPedido", "==", Number(termoCliente));
  }
  if (reqQuery.filtroStatus && reqQuery.filtroAtrasados !== "true") {
    return col.where("statusAtual", "==", String(reqQuery.filtroStatus));
  }
  if (reqQuery.filtroResponsavelUid) {
    return col.where("responsavelUid", "==", String(reqQuery.filtroResponsavelUid));
  }
  if (reqQuery.filtroOcultarEntregues === "true" || reqQuery.filtroAtrasados === "true") {
    return col.where("statusAtual", "!=", "Entregue");
  }
  if (reqQuery.filtroTipo) {
    return col.where("servico.tipo", "==", String(reqQuery.filtroTipo));
  }
  if (reqQuery.dataInicioInclusao) {
    return col.where(
      "criadoEm",
      ">=",
      Timestamp.fromDate(new Date(String(reqQuery.dataInicioInclusao)))
    );
  }
  if (reqQuery.dataInicioRetirada) {
    return col.where(
      "prazos.entrega",
      ">=",
      Timestamp.fromDate(new Date(`${String(reqQuery.dataInicioRetirada)}T00:00:00.000Z`))
    );
  }
  return col.orderBy("criadoEm", "desc").limit(1000);
}

const ACTIVE_PEDIDOS_CACHE_TTL_MS = 45 * 1000;
let activePedidosCache: { items: any[]; expiresAt: number } | null = null;
let activePedidosInFlight: Promise<any[]> | null = null;

export function invalidateActivePedidosCache(): void {
  activePedidosCache = null;
  activePedidosInFlight = null;
}

async function getActivePedidosFromCacheOrDb(
  db: FirebaseFirestore.Firestore,
  forceRefresh = false
): Promise<any[]> {
  if (!forceRefresh && activePedidosCache && Date.now() < activePedidosCache.expiresAt) {
    return activePedidosCache.items;
  }

  if (activePedidosInFlight && !forceRefresh) {
    return activePedidosInFlight;
  }

  activePedidosInFlight = db
    .collection("pedidos")
    .where("statusAtual", "!=", "Entregue")
    .get()
    .then((snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as any[];
      activePedidosCache = {
        items,
        expiresAt: Date.now() + ACTIVE_PEDIDOS_CACHE_TTL_MS,
      };
      return items;
    })
    .finally(() => {
      activePedidosInFlight = null;
    });

  return activePedidosInFlight;
}

async function executarBuscaPedidos(
  db: FirebaseFirestore.Firestore,
  reqQuery: any,
  defaultLimit = 20,
  exigirCamposDashboard = false
) {
  const effectiveQuery = exigirCamposDashboard
    ? { ...reqQuery, filtroOcultarEntregues: "true" }
    : reqQuery;

  const rawLimit = effectiveQuery.itensPorPagina || effectiveQuery.porPagina;
  const limit = Math.max(1, Math.min(200, Number(rawLimit) || defaultLimit));
  const rawPage = effectiveQuery.pagina || effectiveQuery.page;
  const pageNum = rawPage ? Math.max(1, Number(rawPage) || 1) : null;

  let allDocs: any[];
  if (exigirCamposDashboard) {
    allDocs = await getActivePedidosFromCacheOrDb(db, effectiveQuery.refresh === "true");
  } else {
    const snapshot = await buildCandidatePedidosQuery(db, effectiveQuery).get();
    allDocs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];
  }

  const filtered = ordenarPedidosPorEntrega(
    filtrarPedidosEmMemoria(allDocs, effectiveQuery, Date.now(), { exigirCamposDashboard })
  );
  const total = filtered.length;

  let pedidos: any[];
  if (pageNum !== null) {
    const start = (pageNum - 1) * limit;
    pedidos = filtered.slice(start, start + limit);
  } else if (reqQuery.lastEntrega && !Number.isNaN(Number(reqQuery.lastEntrega))) {
    const lastMs = Number(reqQuery.lastEntrega);
    const lastId = typeof reqQuery.lastId === "string" ? reqQuery.lastId : "";
    const startIndex = filtered.findIndex((p) => {
      const ms = extractTimestampMs(p.prazos?.entrega);
      if (ms === null) return true;
      if (ms > lastMs) return true;
      if (ms === lastMs && lastId && String(p.id) > lastId) return true;
      return false;
    });
    pedidos = startIndex >= 0 ? filtered.slice(startIndex, startIndex + limit) : [];
  } else {
    pedidos = filtered.slice(0, limit);
  }

  let nextLastEntrega: number | null = null;
  let nextLastId: string | null = null;
  let nextLastResponsavelNome: string | null = null;
  const ultimoPedido = pedidos.at(-1);
  if (ultimoPedido) {
    const ms = extractTimestampMs(ultimoPedido.prazos?.entrega);
    if (ms !== null) {
      nextLastEntrega = ms;
    }
    nextLastId = ultimoPedido.id;
    const responsavelNome = ultimoPedido.responsavelNomeNormalizado
      ? String(ultimoPedido.responsavelNomeNormalizado)
      : normalizarTexto(String(ultimoPedido.responsavel || ""));
    nextLastResponsavelNome = responsavelNome || null;
  }

  return {
    pedidos,
    nextLastEntrega,
    nextLastId,
    nextLastResponsavelNome,
    total,
  };
}

export function createProtectedDashboardRouter(): express.Router {
  const router = express.Router();

  router.get("/auth/verify", (req, res) => {
    const user = (req as any).user;
    return res.status(200).json({
      authorized: true,
      uid: user?.uid || null,
      setor: user?.setor || null,
    });
  });

  router.post("/dashboard/criarPedido", async (req, res) => {
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
        codigoClienteTagPlus,
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

      if (responsavelUid) {
        try {
          await admin.auth().getUser(responsavelUid);
        } catch {
          return res.status(400).json({
            message: "responsavelUid inválido ou usuário não existe",
          });
        }
      }

      const db = admin.firestore();

      let requerGalpaoFinal = requerGalpao;
      let requerArteFinal = requerArte;

      if (servico.tipo === "COMUNICACAO_VISUAL") {
        if (servico.subTipo === "PLACA_SIMPLES" || servico.subTipo === "PLACA_COMPLEXA") {
          requerGalpaoFinal = true;
        }
      }

      if (servico.tipo === "ARTE") {
        requerArteFinal = true;
      }

      const responsavelNomeNormalizado = normalizarTexto(responsavel);

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
        responsavelNomeNormalizado,
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
        codigoClienteOmie: (codigoClienteTagPlus ?? codigoClienteOmie) ? Number(codigoClienteTagPlus ?? codigoClienteOmie) : null,
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
        entregueEm: null,
      });

      const pedidoRef = await db.collection("pedidos").add(pedidoData);
      await pedidoRef.update({ pedidoID: pedidoRef.id });
      invalidateActivePedidosCache();

      return res.status(201).json({ pedidoID: pedidoRef.id });
    } catch (error) {
      logError("Erro ao criar pedido:", error instanceof Error ? error.message : "Erro desconhecido");
      return res.status(500).json({ message: "Erro ao criar pedido" });
    }
  });

  router.post("/dashboard/editarPedido", async (req, res) => {
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

      const db = admin.firestore();
      const pedidoRef = db.collection("pedidos").doc(pedidoID);
      const pedidoSnap = await pedidoRef.get();

      if (!pedidoSnap.exists) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      const pedido = pedidoSnap.data();
      if (!pedido) {
        return res.status(500).json({ message: "Erro ao obter dados do pedido" });
      }

      const currentUser = (req as any).user;
      const updateData: any = {};

      const podeEditarPrazo = podeEditarPrazoEntrega(pedido, currentUser);
      const podeEditarStatus = podeEditarPedidoBackend(pedido, currentUser);
      const podeEditarArte = podeEditarStatusArte(pedido, currentUser);
      const podeEditarGalpao = podeEditarStatusGalpao(pedido, currentUser);

      if (novaDataEntrega && !podeEditarPrazo) {
        return res.status(403).json({
          message: "Sem permissão para realizar esta operação",
          details: "Você não tem permissão para alterar a data de entrega.",
        });
      }

      if (novoStatusGeral && novoStatusGeral !== pedido.statusAtual && !podeEditarStatus) {
        return res.status(403).json({
          message: "Sem permissão para realizar esta operação",
          details: "Você não tem permissão para alterar o status geral.",
        });
      }

      if (novoStatusArte !== undefined && !podeEditarArte) {
        return res.status(403).json({
          message: "Sem permissão para realizar esta operação",
          details: "Você não tem permissão para alterar o status da arte.",
        });
      }

      if (novoStatusGalpao !== undefined && !podeEditarGalpao) {
        return res.status(403).json({
          message: "Sem permissão para realizar esta operação",
          details: "Você não tem permissão para alterar o status do galpão.",
        });
      }

      if (podeEditarPrazo && novaDataEntrega) {
        try {
          const [year, month, day] = novaDataEntrega.split("-").map(Number);
          const brasilTimeOffsetMs = 3 * 60 * 60 * 1000;

          const horario = novoHorarioEntrega || "08:00";
          const [hours, minutes] = horario.split(":").map(Number);

          const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
          const adjustedDate = new Date(utcDate.getTime() + brasilTimeOffsetMs);

          updateData["prazos.entrega"] = Timestamp.fromDate(adjustedDate);
          updateData.horarioRetirada = horario;
        } catch (error) {
          logError("Erro ao processar data:", error);
          return res.status(400).json({
            message: "Erro ao processar data de entrega",
            details: String(error),
          });
        }
      }

      if (
        podeEditarStatus &&
        (novoStatusGeral !== undefined || novoStatusArte !== undefined || novoStatusGalpao !== undefined)
      ) {
        const now = Timestamp.now();

        if (novoStatusGeral !== undefined && novoStatusGeral !== pedido.statusAtual) {
          updateData.statusAtual = novoStatusGeral;

          updateData.historicoStatus = FieldValue.arrayUnion({
            status: novoStatusGeral,
            data: now,
            responsavel: userInfo?.userDisplayName || "Sistema",
            setor: userInfo?.userSetor || "SISTEMA",
          });

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

        if (novoStatusArte !== undefined && pedido.requerArte) {
          const ultimoStatusArte =
            pedido.StatusArte && pedido.StatusArte.length > 0 ? pedido.StatusArte.at(-1).status : null;

          if (novoStatusArte !== ultimoStatusArte) {
            updateData.StatusArte = FieldValue.arrayUnion({
              status: novoStatusArte,
              data: now,
              responsavel: userInfo?.userDisplayName || "Sistema",
            });
          }
        }

        if (novoStatusGalpao !== undefined && pedido.requerGalpao) {
          const ultimoStatusGalpao =
            pedido.StatusGalpao && pedido.StatusGalpao.length > 0 ? pedido.StatusGalpao.at(-1).status : null;

          if (novoStatusGalpao !== ultimoStatusGalpao) {
            updateData.StatusGalpao = FieldValue.arrayUnion({
              status: novoStatusGalpao,
              data: now,
              responsavel: userInfo?.userDisplayName || "Sistema",
            });
          }
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Nenhum dado válido para atualização" });
      }

      await pedidoRef.update(updateData);
      invalidateActivePedidosCache();
      return res.status(200).json({ message: "Pedido atualizado com sucesso" });
    } catch (error) {
      logError("Erro ao editar pedido:", error instanceof Error ? error.message : "Erro desconhecido");
      return res.status(500).json({ message: "Erro ao editar pedido" });
    }
  });

  router.delete("/dashboard/deletarPedido", async (req, res) => {
    try {
      const { pedidoID, motivo } = req.body;
      if (!pedidoID) {
        return res.status(400).json({ message: "Parâmetro obrigatório não preenchido: pedidoID" });
      }
      const motivoFinal = typeof motivo === "string" && motivo.trim().length > 0
        ? motivo.trim()
        : "Não informado";

      const db = admin.firestore();
      const pedidoRef = db.collection("pedidos").doc(pedidoID);
      const pedidoDoc = await pedidoRef.get();
      if (!pedidoDoc.exists) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      const pedidoData = pedidoDoc.data() || {};
      const user = (req as any).user || {};

      // Snapshot completo e imutável para auditoria
      const excluidoEm = Timestamp.now();
      const logExclusao = {
        id: pedidoID,
        pedidoId: pedidoID,
        numeroPedido: pedidoData.numeroPedido ?? null,
        cliente: pedidoData.cliente ?? null,
        valorTotal: pedidoData.servico?.valorTotal ?? pedidoData.valorTotal ?? null,
        dadosOriginais: pedidoData,
        excluidoPor: {
          uid: user.uid || "sistema",
          nome: user.displayName || user.name || "Usuário",
          email: user.email || "",
          setor: user.setor || user.setorNome || "",
        },
        excluidoEm,
        motivo: motivoFinal,
        restaurado: false,
        restauradoEm: null,
        restauradoPor: null,
      };

      await db.collection("pedidos_excluidos").doc(pedidoID).set(logExclusao);
      await pedidoRef.delete();
      invalidateActivePedidosCache();
      return res.status(200).json({ message: "Pedido deletado com sucesso" });
    } catch (error) {
      logError("Erro ao deletar pedido:", error instanceof Error ? error.message : "Erro desconhecido");
      return res.status(500).json({ message: "Erro ao deletar pedido" });
    }
  });

  const requireAuditAccess = createSetorMiddleware(
    ["SUPORTE", "GESTAO", "COORDENACAO"],
    "Acesso negado: apenas Suporte ou Coordenação/Gestão podem acessar auditoria de exclusões."
  );

  router.get("/dashboard/pedidosExcluidos", requireAuditAccess, async (req, res) => {
    try {
      const db = admin.firestore();
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));
      const { dataInicio, dataFim, termo } = req.query as Record<string, string | undefined>;

      let query: FirebaseFirestore.Query = db.collection("pedidos_excluidos");

      if (dataInicio) {
        const dInicio = new Date(`${dataInicio}T00:00:00.000Z`);
        if (!isNaN(dInicio.getTime())) {
          query = query.where("excluidoEm", ">=", Timestamp.fromDate(dInicio));
        }
      }

      if (dataFim) {
        const dFim = new Date(`${dataFim}T23:59:59.999Z`);
        if (!isNaN(dFim.getTime())) {
          query = query.where("excluidoEm", "<=", Timestamp.fromDate(dFim));
        }
      }

      query = query.orderBy("excluidoEm", "desc").limit(1000);

      const snapshot = await query.get();
      let docs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          pedidoId: data.pedidoId || doc.id,
          numeroPedido: data.numeroPedido,
          cliente: data.cliente,
          valorTotal: data.valorTotal,
          excluidoPor: data.excluidoPor,
          excluidoEm: data.excluidoEm,
          motivo: data.motivo,
          restaurado: Boolean(data.restaurado),
          restauradoEm: data.restauradoEm || null,
          restauradoPor: data.restauradoPor || null,
        };
      });

      if (termo && termo.trim()) {
        const t = normalizarTexto(termo.trim());
        docs = docs.filter((d) => {
          const numStr = String(d.numeroPedido || "");
          const clienteNome = normalizarTexto(
            d.cliente?.nome || d.cliente?.razaoSocial || (typeof d.cliente === "string" ? d.cliente : "")
          );
          const motivoStr = normalizarTexto(d.motivo || "");
          const quemExcluiu = normalizarTexto(d.excluidoPor?.nome || "");
          return (
            numStr.includes(t) ||
            clienteNome.includes(t) ||
            motivoStr.includes(t) ||
            quemExcluiu.includes(t)
          );
        });
      }

      const total = docs.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const offset = (page - 1) * limit;
      const paginatedItems = docs.slice(offset, offset + limit);

      return res.status(200).json({
        logs: deepConvertTimestamps(paginatedItems),
        total,
        page,
        totalPages,
      });
    } catch (error) {
      logError("Erro ao buscar logs de pedidos excluídos:", error);
      return res.status(500).json({ message: "Erro ao buscar pedidos excluídos" });
    }
  });

  router.get("/dashboard/pedidosExcluidos/:id", requireAuditAccess, async (req, res) => {
    try {
      const { id } = req.params;
      const db = admin.firestore();
      const docRef = db.collection("pedidos_excluidos").doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ message: "Registro de exclusão não encontrado" });
      }
      return res.status(200).json(deepConvertTimestamps(docSnap.data()));
    } catch (error) {
      logError("Erro ao buscar detalhes do pedido excluído:", error);
      return res.status(500).json({ message: "Erro ao buscar detalhes do pedido excluído" });
    }
  });

  router.post("/dashboard/restaurarPedido", requireAuditAccess, async (req, res) => {
    try {
      const { pedidoID } = req.body;
      if (!pedidoID) {
        return res.status(400).json({ message: "pedidoID é obrigatório" });
      }

      const db = admin.firestore();
      const logRef = db.collection("pedidos_excluidos").doc(pedidoID);
      const logSnap = await logRef.get();
      if (!logSnap.exists) {
        return res.status(404).json({ message: "Registro de exclusão não encontrado" });
      }

      const logData = logSnap.data();
      if (!logData || !logData.dadosOriginais) {
        return res.status(400).json({ message: "Dados originais do pedido não disponíveis para restauração" });
      }

      const pedidoRef = db.collection("pedidos").doc(pedidoID);
      const pedidoExistente = await pedidoRef.get();
      if (pedidoExistente.exists) {
        return res.status(409).json({ message: "Já existe um pedido ativo com este ID" });
      }

      const user = (req as any).user || {};
      const now = Timestamp.now();

      // Reconstrói o pedido original com atualização no histórico
      const dadosRestaurados = {
        ...logData.dadosOriginais,
        atualizadoEm: now,
        historicoStatus: [
          ...(logData.dadosOriginais.historicoStatus ?? []),
          {
            status: logData.dadosOriginais.statusAtual || "Em Aberto",
            data: now,
            responsavel: user.displayName || user.name || "Usuário",
            setor: user.setor || user.setorNome || "SUPORTE",
            observacao: "Pedido restaurado a partir da auditoria de exclusões",
          },
        ],
      };

      await pedidoRef.set(dadosRestaurados);

      // Atualiza o log para restaurado
      await logRef.update({
        restaurado: true,
        restauradoEm: now,
        restauradoPor: {
          uid: user.uid || "sistema",
          nome: user.displayName || user.name || "Usuário",
          email: user.email || "",
          setor: user.setor || user.setorNome || "",
        },
      });

      invalidateActivePedidosCache();
      return res.status(200).json({ message: "Pedido restaurado com sucesso!" });
    } catch (error) {
      logError("Erro ao restaurar pedido:", error);
      return res.status(500).json({ message: "Erro ao restaurar pedido" });
    }
  });

  router.get("/dashboard/buscarPedidos", async (req, res) => {
    try {
      const db = admin.firestore();
      const resultado = await executarBuscaPedidos(db, req.query, 10, true);
      return res.json(resultado);
    } catch (error) {
      logError("Erro ao buscar pedidos:", error);
      return res.status(500).json({ message: "Erro ao buscar pedidos" });
    }
  });

  router.post("/dashboard/marcarComoEntregue", async (req, res) => {
    try {
      const { pedidoID } = req.body;
      const db = admin.firestore();
      const pedidoRef = db.collection("pedidos").doc(pedidoID);
      const pedidoDoc = await pedidoRef.get();
      if (!pedidoDoc.exists) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      const pedido = pedidoDoc.data();

      if (!pedido || !podeMarcarEntregue(pedido, (req as any).user)) {
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
          { status: "Entregue", data: now, responsavel: (req as any).user.name, setor: (req as any).user.setor },
        ],
      });
      invalidateActivePedidosCache();

      return res.status(200).json({ message: "Pedido marcado como entregue!" });
    } catch (error) {
      logError("Erro ao marcar como entregue:", error);
      return res.status(500).json({ message: "Erro ao marcar como entregue" });
    }
  });

  router.get("/relatorios/buscarPedidos", async (req, res) => {
    try {
      const db = admin.firestore();
      const resultado = await executarBuscaPedidos(db, req.query, 20);
      return res.json({
        pedidos: resultado.pedidos.map((p) => ({
          ...p,
          criadoEm: p.criadoEm ?? null,
          prazos: p.prazos ?? {},
        })),
        nextLastEntrega: resultado.nextLastEntrega,
        nextLastId: resultado.nextLastId,
        total: resultado.total,
      });
    } catch (error) {
      logError("Erro ao buscar pedidos:", error);
      return res.status(500).json({ message: "Erro ao buscar pedidos" });
    }
  });

  return router;
}
