export function podeEditarPedidoBackend(pedido: any, usuario: any): boolean {
  // Verifica se o usuário é o responsável pelo pedido
  const isResponsavel =
    pedido.responsavelUid === usuario.uid ||
    pedido.responsavel === usuario.name;

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

  // O usuário pode editar se:
  // 1. Pertence a um setor permitido, OU
  // 2. É responsável por um pedido de serviço terceirizado, OU
  // 3. É responsável por um pedido de gráfica rápida, OU
  // 4. Pertence ao setor ARTE e o pedido é do tipo ARTE
  return (
    isSetorPermitido ||
    isServicoTerceirizado ||
    isServicoGraficaRapida ||
    isServicoArte
  );
}

export function podeEditarPrazoEntrega(pedido: any, user: any) {
  return (
    user.uid === pedido.responsavelUid ||
    ["SUPORTE", "GESTAO"].includes(user.setor)
  );
}

export function podeEditarStatusGeral(pedido: any, user: any) {
  return (
    ["PRODUCAO_LOJA", "SUPORTE", "GESTAO"].includes(user.setor) ||
    (pedido.servico.tipo === "TERCEIRIZADO" && user.displayName === pedido.responsavel) ||
    (pedido.servico.tipo === "GRAFICA_RAPIDA" && user.displayName === pedido.responsavel) ||
    (pedido.servico.tipo === "ARTE" && user.setor === "ARTE")
  );
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