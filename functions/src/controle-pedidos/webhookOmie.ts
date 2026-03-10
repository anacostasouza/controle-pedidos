import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { deepConvertTimestamps } from "../utils/deepConvertTimestamps";

// Funções de processamento de webhook Omie
export async function processarWebhookOmie(event: string, data: any, db: admin.firestore.Firestore) {
  switch (event) {
    case "pedido.criado":
      await procesarPedidoCriado(data, db);
      break;
    default:
      console.log(`[WEBHOOK] Evento não suportado: ${event}`);
  }
}

async function procesarPedidoCriado(data: any, db: admin.firestore.Firestore) {
  try {
    console.log(`[WEBHOOK] Iniciando processamento do pedido:`, JSON.stringify(data, null, 2));

    // Extrai dados essenciais do pedido Omie
    const numeroPedido = data.numero_pedido || data.numero;
    const nomeCliente = data.cliente?.nome || "Cliente não informado";
    const responsavel = data.vendedor?.nome || "Vendedor não informado";
    const dataCriacao = data.data_criacao || new Date().toISOString();
    const dataEntrega = data.data_entrega || null;
    const valorTotal = data.valor_total || 0;

    console.log(`[WEBHOOK] Dados extraídos: numeroPedido=${numeroPedido}, nomeCliente=${nomeCliente}, dataCriacao=${dataCriacao}`);

    // Verifica se o pedido já existe (evita duplicatas)
    const pedidoExistente = await db.collection("pedidos")
      .where("numeroPedido", "==", numeroPedido)
      .limit(1)
      .get();

    if (!pedidoExistente.empty) {
      console.log(`[WEBHOOK] Pedido ${numeroPedido} já existe, ignorando duplicata`);
      return;
    }

    console.log(`[WEBHOOK] Criando pedido ${numeroPedido}...`);

    // Cria o pedido no sistema seguindo a mesma estrutura dos pedidos normais
    const pedidoData = deepConvertTimestamps({
      pedidoID: "",
      numeroPedido: Number(numeroPedido),
      nomeCliente: nomeCliente.toUpperCase(),
      servico: {
        tipo: "TERCEIRIZADO",
        subTipo: null,
        servicoID: 5, // ID do tipo TERCEIRIZADO
      },
      responsavel,
      responsavelUid: "", // Campo obrigatório, deixar vazio para webhooks 
      retrabalho: false,
      requerArte: false,
      StatusArte: [],
      requerGalpao: false,
      StatusGalpao: [],
      setoresResponsaveis: ["OMIE"],
      statusAtual: "Aguardando Arte",
      historicoStatus: [{
        status: "Aguardando Arte",
        data: Timestamp.now(),
        responsavel: responsavel,
        setor: "OMIE"
      }],
      prazos: {
        entrega: dataEntrega ? Timestamp.fromDate(new Date(dataEntrega)) : Timestamp.fromDate(new Date(dataCriacao)),
      },
      horarioRetirada: null,
      tipoDeEntrega: "Retirada",
      atendimentoId: null,
      origem: "Omie",
      codigoClienteOmie: data.cliente?.codigo ? Number(data.cliente.codigo) : null,
      criadoEm: Timestamp.now(),
      atualizadoEm: Timestamp.now(),
      entregueEm: null,
    });

    // Só adiciona omieData se houver pelo menos um campo válido
    const omieDataFields: any = {};
    if (data.codigo_pedido !== undefined && data.codigo_pedido !== null && data.codigo_pedido !== '') omieDataFields.codigoPedido = data.codigo_pedido;
    if (data.cliente?.codigo !== undefined && data.cliente?.codigo !== null && data.cliente?.codigo !== '') omieDataFields.codigoCliente = data.cliente.codigo;
    if (data.vendedor?.codigo !== undefined && data.vendedor?.codigo !== null && data.vendedor?.codigo !== '') omieDataFields.codigoVendedor = data.vendedor.codigo;
    if (data.etapa !== undefined && data.etapa !== null && data.etapa !== '') omieDataFields.etapa = data.etapa;
    if (data.situacao !== undefined && data.situacao !== null && data.situacao !== '') omieDataFields.situacao = data.situacao;

    // Só inclui omieData se houver pelo menos um campo
    if (Object.keys(omieDataFields).length > 0) {
      (pedidoData as any).omieData = omieDataFields;
      console.log(`[WEBHOOK] Incluindo omieData:`, omieDataFields);
    } else {
      console.log(`[WEBHOOK] Nenhum campo omieData válido, omitindo`);
    }

    console.log(`[WEBHOOK] Documento final:`, JSON.stringify(pedidoData, null, 2));

    const pedidoRef = await db.collection("pedidos").add(pedidoData);
    await pedidoRef.update({ pedidoID: pedidoRef.id });

    console.log(`[WEBHOOK] Pedido criado com sucesso: ${numeroPedido} (ID: ${pedidoRef.id})`);

  } catch (error) {
    console.error("[WEBHOOK] Erro ao processar pedido criado:", error);
    throw error;
  }
}