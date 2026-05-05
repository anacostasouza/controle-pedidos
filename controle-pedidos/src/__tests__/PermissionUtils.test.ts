import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import {
  podeEditarPedido,
  podeEditarPrazoEntrega,
  podeMarcarEntregue,
  podeEditarStatusArte,
  podeEditarStatusGalpao,
} from "./PermissionUtils";
import type { Pedido } from "../types/Pedidos";

const basePedido: Pedido = {
  pedidoID: "1",
  numeroPedido: 1,
  nomeCliente: "Cliente",
  servico: { tipo: "ARTE", servicoID: 1 },
  responsavel: "Ana",
  responsavelUid: "uid-1",
  setoresResponsaveis: ["ARTE"],
  statusAtual: "Iniciado",
  historicoStatus: [],
  prazos: { entrega: Timestamp.now() },
  tipoDeEntrega: "Entrega",
  criadoEm: Timestamp.now(),
  atualizadoEm: Timestamp.now(),
};

describe("PermissionUtils", () => {
  it("bloqueia edicao quando pedido entregue", () => {
    const pedido = { ...basePedido, statusAtual: "Entregue" };
    const usuario = { setor: "SUPORTE", displayName: "Ana", uid: "uid-1" };
    expect(podeEditarPedido(pedido, usuario)).toBe(false);
  });

  it("permite editar prazo quando responsavel", () => {
    const usuario = { setor: "ARTE", displayName: "Ana", uid: "uid-1" };
    expect(podeEditarPrazoEntrega(basePedido, usuario)).toBe(true);
  });

  it("permite marcar entregue quando status concluido e setor permitido", () => {
    const pedido = { ...basePedido, statusAtual: "Concluído" };
    const usuario = { setor: "BALCAO", displayName: "Ana", uid: "uid-1" };
    expect(podeMarcarEntregue(pedido, usuario)).toBe(true);
  });

  it("permite editar status de arte quando requer arte", () => {
    const pedido = { ...basePedido, requerArte: true };
    const usuario = { setor: "ARTE", displayName: "Ana", uid: "uid-1" };
    expect(podeEditarStatusArte(pedido, usuario)).toBe(true);
  });

  it("permite editar status de galpao quando requer galpao", () => {
    const pedido = { ...basePedido, requerGalpao: true };
    const usuario = { setor: "GALPAO", displayName: "Ana", uid: "uid-1" };
    expect(podeEditarStatusGalpao(pedido, usuario)).toBe(true);
  });
});
