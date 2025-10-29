export function podeEditarPedidoBackend(pedido: any, usuario: any): boolean {
  console.log("=== DEBUG PERMISSÃO ===");
  console.log("Usuario:", {
    uid: usuario.uid,
    displayName: usuario.displayName,
    name: usuario.name,
    setor: usuario.setor
  });
  console.log("Pedido:", {
    responsavel: pedido.responsavel,
    responsavelUid: pedido.responsavelUid,
    tipo: pedido.servico?.tipo
  });

  // Verifica se o usuário é o responsável pelo pedido
  const isResponsavel =
    pedido.responsavelUid === usuario.uid ||
    pedido.responsavel === usuario.displayName ||
    pedido.responsavel === usuario.name;

  // Verifica se o usuário pertence aos setores permitidos
  const setoresPermitidos = ["SUPORTE", "GESTAO", "PRODUCAO_LOJA"];
  const userSetor = usuario.setor;
  const isSetorPermitido = setoresPermitidos.includes(userSetor);

  console.log("Verificações:", {
    isResponsavel,
    userSetor,
    isSetorPermitido,
    setoresPermitidos
  });

  // Casos especiais por tipo de serviço
  const isServicoTerceirizado =
    pedido.servico.tipo === "TERCEIRIZADO" && isResponsavel;
  const isServicoGraficaRapida =
    pedido.servico.tipo === "GRAFICA_RAPIDA" && isResponsavel;
  const isServicoArte = pedido.servico.tipo === "ARTE" && userSetor === "ARTE";

  console.log("Casos especiais:", {
    isServicoTerceirizado,
    isServicoGraficaRapida,
    isServicoArte
  });

  const resultado = (
    isSetorPermitido ||
    isServicoTerceirizado ||
    isServicoGraficaRapida ||
    isServicoArte
  );

  console.log("Resultado final:", resultado);
  console.log("=== FIM DEBUG ===\n");

  return resultado;
}

export function podeEditarPrazoEntrega(pedido: any, user: any) {
  console.log("=== DEBUG PRAZO ENTREGA ===");
  console.log("User:", { uid: user.uid, setor: user.setor });
  console.log("Pedido:", { responsavelUid: pedido.responsavelUid });
  
  const resultado = (
    user.uid === pedido.responsavelUid ||
    user.displayName === pedido.responsavel ||
    ["SUPORTE", "GESTAO"].includes(user.setor)
  );
  
  console.log("Pode editar prazo:", resultado);
  console.log("=== FIM DEBUG ===\n");
  
  return resultado;
}

export function podeEditarStatusGeral(pedido: any, user: any) {
  console.log("=== DEBUG STATUS GERAL ===");
  console.log("User setor:", user.setor);
  console.log("Pedido tipo:", pedido.servico?.tipo);
  
  const resultado = (
    ["PRODUCAO_LOJA", "SUPORTE", "GESTAO"].includes(user.setor) ||
    (pedido.servico.tipo === "TERCEIRIZADO" && user.displayName === pedido.responsavel) ||
    (pedido.servico.tipo === "GRAFICA_RAPIDA" && user.displayName === pedido.responsavel) ||
    (pedido.servico.tipo === "ARTE" && user.setor === "ARTE")
  );
  
  console.log("Pode editar status geral:", resultado);
  console.log("=== FIM DEBUG ===\n");
  
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