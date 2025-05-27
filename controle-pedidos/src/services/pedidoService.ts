import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import type { Pedido } from '../types/Pedidos';

const db = firebase.firestore();

export class PedidoService {
  private readonly pedidosRef = db.collection('pedidos');

  async criarPedido(pedido: Omit<Pedido, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<string> {
    const now = firebase.firestore.Timestamp.now();
    const docRef = await this.pedidosRef.add({
      ...pedido,
      criadoEm: now,
      atualizadoEm: now,
    });
    return docRef.id;
  }

  async atualizarStatus(
    pedidoId: string,
    novoStatus: string,
    userId: string
  ): Promise<void> {
    const now = firebase.firestore.Timestamp.now();
    const pedidoRef = this.pedidosRef.doc(pedidoId);

    await firebase.firestore().runTransaction(async (transaction: firebase.firestore.Transaction) => {
      const pedidoDoc = await transaction.get(pedidoRef);
      if (!pedidoDoc.exists) throw new Error('Pedido não encontrado');

      const pedido = pedidoDoc.data() as Pedido;
      const novoHistorico = [
        ...pedido.historicoStatus,
        {
          status: novoStatus,
          data: now,
          responsavel: userId,
        },
      ];

      transaction.update(pedidoRef, {
        statusAtual: novoStatus,
        historicoStatus: novoHistorico,
        atualizadoEm: now,
      });
    });
  }

  async listarPorStatusETipo(
    status: string,
    tipoServico?: string
  ): Promise<Pedido[]> {
    let query: firebase.firestore.Query = this.pedidosRef.where(
      'statusAtual',
      '==',
      status
    );

    if (tipoServico) {
      query = query.where('servico.tipo', '==', tipoServico);
    }

    const snapshot = await query.orderBy('prazos.entrega').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Pedido));
  }
}