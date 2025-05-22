import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import type { Pedido } from "../types/Pedidos";

const pedidosRef = collection(db, "pedidos");

export const criarPedido = async (pedido: Omit<Pedido, "id">) => {
  const docRef = await addDoc(pedidosRef, pedido);
  return docRef.id;
};

export const listarPedidos = async (): Promise<Pedido[]> => {
  const snapshot = await getDocs(pedidosRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Pedido));
};

export const atualizarPedido = async (id: string, dados: Partial<Pedido>) => {
  const docRef = doc(db, "pedidos", id);
  await updateDoc(docRef, dados);
};

export const deletarPedido = async (id: string) => {
  const docRef = doc(db, "pedidos", id);
  await deleteDoc(docRef);
};
