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

  const snapshot = await buildCandidatePedidosQuery(db, effectiveQuery).get();
  const allDocs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as any[];

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
      return res.status(200).json({ message: "Pedido atualizado com sucesso" });
    } catch (error) {
      logError("Erro ao editar pedido:", error instanceof Error ? error.message : "Erro desconhecido");
      return res.status(500).json({ message: "Erro ao editar pedido" });
    }
  });

  router.delete("/dashboard/deletarPedido", async (req, res) => {
    try {
      const { pedidoID } = req.body;
      if (!pedidoID) {
        return res.status(400).json({ message: "Parâmetro obrigatório não preenchido" });
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
      logError("Erro ao deletar pedido:", error instanceof Error ? error.message : "Erro desconhecido");
      return res.status(500).json({ message: "Erro ao deletar pedido" });
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
