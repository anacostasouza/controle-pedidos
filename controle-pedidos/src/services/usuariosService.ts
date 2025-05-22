import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import type { Usuario } from "../types/Usuario";

const usuariosRef = collection(db, "usuarios");

export const criarUsuario = async (usuario: Omit<Usuario, "id">) => {
  const docRef = await addDoc(usuariosRef, usuario);
  return docRef.id;
};

export const listarUsuarios = async (): Promise<Usuario[]> => {
  const snapshot = await getDocs(usuariosRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Usuario));
};

export const atualizarUsuario = async (id: string, dadosAtualizados: Partial<Usuario>) => {
  const docRef = doc(db, "usuarios", id);
  await updateDoc(docRef, dadosAtualizados);
};

export const deletarUsuario = async (id: string) => {
  const docRef = doc(db, "usuarios", id);
  await deleteDoc(docRef);
};
