import type { Pedido } from "../types/Pedidos";

interface Usuario {
  setor: string;
  displayName: string;
  uid: string;
}

/**
 * Verifica se o usuário pode editar um pedido 
 */
export function podeEditarPedido(pedido: Pedido, usuario: Usuario): boolean {
  if (!pedido || !usuario) return false;
  if (pedido.statusAtual === "Entregue") return false;

  // Verifica se é responsável pelo pedido
  const isResponsavel = 
    pedido.responsavelUid === usuario.uid ||
    pedido.responsavel === usuario.displayName;

  // Setores com permissão global
  const setoresPermitidos = ["SUPORTE", "GESTAO", "PRODUCAO_LOJA"];
  const isSetorPermitido = setoresPermitidos.includes(usuario.setor);

  // Casos especiais por tipo de serviço
  const isServicoTerceirizado = 
    pedido.servico.tipo === "TERCEIRIZADO" && isResponsavel;
  const isServicoGraficaRapida = 
    pedido.servico.tipo === "GRAFICA_RAPIDA" && isResponsavel;
  const isServicoArte = 
    pedido.servico.tipo === "ARTE" && usuario.setor === "ARTE";

  return (
    isSetorPermitido ||
    isServicoTerceirizado ||
    isServicoGraficaRapida ||
    isServicoArte
  );
}

/**
 * Verifica se o usuário pode marcar pedido como entregue
 */
export function podeMarcarEntregue(pedido: Pedido, usuario: Usuario): boolean {
  // Só pode marcar como entregue se o pedido estiver concluído
  if (pedido.statusAtual !== "Concluído") {
    return false;
  }
  
  return ["BALCAO", "CAIXA", "SUPORTE", "GESTAO"].includes(usuario.setor);
}

/**
 * Verifica se o usuário pode editar prazo de entrega
 */
export function podeEditarPrazoEntrega(pedido: Pedido, usuario: Usuario): boolean {

  // Se for responsável, PODE editar prazo
  const isResponsavelPorUid = usuario.uid === pedido.responsavelUid;
  const isResponsavelPorNome = usuario.displayName === pedido.responsavel;
  const isResponsavel = isResponsavelPorUid || isResponsavelPorNome;

  if (import.meta.env.DEV) {
    console.log("🔍 Verificando responsável:", {
      isResponsavelPorUid,
      isResponsavelPorNome,
      isResponsavel
    });
  }

  if (isResponsavel) {
    return true;
  }

  // Setores com permissão de editar prazo
  const setoresPermitidos = ["SUPORTE", "GESTAO", "PRODUCAO_LOJA"];
  const temSetorPermitido = setoresPermitidos.includes(usuario.setor);

  if (temSetorPermitido) {
    return true;
  }

  return false;
}

/**
 * Verifica se o usuário pode editar status geral
 */
export function podeEditarStatusGeral(pedido: Pedido, usuario: Usuario): boolean {
  return (
    ["PRODUCAO_LOJA", "SUPORTE", "GESTAO"].includes(usuario.setor) ||
    (pedido.servico.tipo === "TERCEIRIZADO" && usuario.displayName === pedido.responsavel) ||
    (pedido.servico.tipo === "GRAFICA_RAPIDA" && usuario.displayName === pedido.responsavel) ||
    (pedido.servico.tipo === "ARTE" && usuario.setor === "ARTE")
  );
}

/**
 * Verifica se o usuário pode editar status de arte
 */
export function podeEditarStatusArte(pedido: Pedido, usuario: Usuario): boolean {
  // Só pode editar status de arte se o pedido requer arte
  if (!pedido.requerArte) {
    return false;
  }
  
  return ["ARTE", "SUPORTE", "GESTAO"].includes(usuario.setor);
}

/**
 * Verifica se o usuário pode editar status do galpão
 */
export function podeEditarStatusGalpao(pedido: Pedido, usuario: Usuario): boolean {
  // Só pode editar status de galpão se o pedido requer galpão
  if (!pedido.requerGalpao) {
    return false;
  }
  
  return ["GALPAO", "SUPORTE", "GESTAO"].includes(usuario.setor);
}