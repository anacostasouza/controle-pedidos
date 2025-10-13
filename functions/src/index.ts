import * as admin from "firebase-admin";
admin.initializeApp();

export * from "./atendimento/funcAtendimento";
export * from "./controle-pedidos/funcControlePedidos";