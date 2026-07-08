import * as admin from "firebase-admin";

// Inicializa o Firebase Admin com configuração adequada para emulador
if (!admin.apps.length) {
  admin.initializeApp();
}

export * from "./atendimento/funcAtendimento";
export * from "./controle-pedidos/funcControlePedidos";
export * from "./usuarios/funcUsuarios";
export * from "./tagplus/funcTagPlus";