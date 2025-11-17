export function podeEditarPedidoBackend(pedido: any, usuario: any): boolean {

  if (pedido.statusAtual === "Entregue") {
    return false;
  }

  // Verifica se o usuário é o responsável pelo pedido
  const isResponsavel =
    pedido.responsavelUid === usuario.uid ||
    pedido.responsavel === usuario.displayName;

  // Verifica se o usuário pertence aos setores permitidos
  const setoresPermitidos = ["SUPORTE", "GESTAO", "PRODUCAO_LOJA"];
  const userSetor = usuario.setor;
  const isSetorPermitido = setoresPermitidos.includes(userSetor);

  // Casos especiais por tipo de serviço
  const isServicoTerceirizado =
    pedido.servico.tipo === "TERCEIRIZADO" && isResponsavel;
  const isServicoGraficaRapida =
    pedido.servico.tipo === "GRAFICA_RAPIDA" && isResponsavel;
  const isServicoArte = pedido.servico.tipo === "ARTE" && userSetor === "ARTE";

  const resultado = (
    isSetorPermitido ||
    isServicoTerceirizado ||
    isServicoGraficaRapida ||
    isServicoArte
  );

  return resultado;
}

export function podeEditarPrazoEntrega(pedido: any, user: any) {

  const resultado = (
    user.uid === pedido.responsavelUid ||
    user.displayName === pedido.responsavel ||
    ["SUPORTE", "GESTAO"].includes(user.setor)
  );
  
  return resultado;
}

export function podeEditarStatusGeral(pedido: any, user: any) {

  const resultado = (
    ["PRODUCAO_LOJA", "SUPORTE", "GESTAO"].includes(user.setor) ||
    (pedido.servico.tipo === "TERCEIRIZADO" && user.displayName === pedido.responsavel) ||
    (pedido.servico.tipo === "GRAFICA_RAPIDA" && user.displayName === pedido.responsavel) ||
    (pedido.servico.tipo === "ARTE" && user.setor === "ARTE")
  );
  
  return resultado;
}

// Método para verificar se o usuário pode editar o status de arte
export function podeEditarStatusArte(pedido: any, user: any) {
  return ["ARTE", "SUPORTE", "GESTAO"].includes(user.setor);
}

// Método para verificar se o usuário pode editar o status do galpão
export function podeEditarStatusGalpao(pedido: any, user: any) {
  return ["GALPAO", "SUPORTE", "GESTAO"].includes(user.setor);
}

// Método para verificar se o usuário pode marcar o pedido como entregue
export function podeMarcarEntregue(pedido: any, user: any) {
  return ["BALCAO", "CAIXA", "SUPORTE", "GESTAO"].includes(user.setor);
}