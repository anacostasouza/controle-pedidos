import type { FirestoreDataConverter } from "firebase/firestore";
import type { Pedido } from "./Pedidos";

export const pedidoConverter: FirestoreDataConverter<Pedido> = {
  toFirestore(pedido) {
    return { ...pedido };
  },
  fromFirestore(snapshot, options) {
    const data = snapshot.data(options);
    return {
      ...data,
      prazoDeEntrega: data.prazoDeEntrega?.toDate()?.toLocaleString() ?? '',
      prazoArte: data.prazoArte?.toDate()?.toLocaleString() ?? ''
    } as Pedido;
  }
};