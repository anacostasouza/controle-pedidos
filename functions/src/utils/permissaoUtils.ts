export function podeEditarPedidoBackend(pedido: any, user: any): boolean {
  if (!pedido) return false;
  const userSetor = (user.setor ?? "").toUpperCase();
  const userDisplayName = user.displayName ?? "";

  if (!userSetor) return false;
  if (pedido.statusAtual === "Entregue") return false;
  if (["GESTAO", "SUPORTE", "PRODUCAO_LOJA"].includes(userSetor)) return true;
  if (userDisplayName && pedido.responsavel === userDisplayName) return true;
  if (
    userSetor === "ARTE" &&
    (pedido.requerArte || pedido.servico?.tipo === "ARTE")
  )
    return true;
  if (
    userSetor === "GALPAO" &&
    (pedido.requerGalpao || pedido.servico?.tipo === "COMUNICACAO_VISUAL")
  )
    return true;
  return false;
}