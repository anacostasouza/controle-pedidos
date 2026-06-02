const admin = require("firebase-admin");

const projectId = process.env.FIREBASE_PROJECT_ID || "gestaopedidos-desenhar";
const email = process.env.E2E_EMAIL || "desenhar@gmail.com";
const password = process.env.E2E_PASSWORD || "Senha123!";
const uid = process.env.E2E_UID || "e2e-user";

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();
const auth = admin.auth();

async function ensureUser() {
  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, {
      email,
      password,
      displayName: "Usuario E2E",
    });
  } catch {
    await auth.createUser({
      uid,
      email,
      password,
      displayName: "Usuario E2E",
    });
  }

  const now = admin.firestore.Timestamp.now();
  await db.collection("usuarios").doc(uid).set(
    {
      createdAt: now,
      updatedAt: now,
      displayName: "Usuario E2E",
      email,
      setor: "SUPORTE",
      setorNome: "Suporte",
      statusConta: true,
      usuarioID: uid,
      emailVerified: true,
    },
    { merge: true }
  );
}

async function seedAtendimento() {
  await db.collection("servicosAtendimento").doc("consulta").set(
    {
      tipo: "Consulta",
    },
    { merge: true }
  );
}

async function seedControlePedidos() {
  const now = admin.firestore.Timestamp.now();
  await db.collection("servicosStatus").doc("ARTE").set(
    {
      tipo: "ARTE",
      statusSequence: ["Iniciado", "Aguardando Aprovação", "Aprovado", "Concluído"],
      sequenciaStatus: ["Iniciado", "Aguardando Aprovação", "Aprovado", "Concluído"],
    },
    { merge: true }
  );

  await db.collection("pedidos").doc("pedido-e2e").set(
    {
      pedidoID: "PED-1",
      numeroPedido: 1001,
      nomeCliente: "Cliente E2E",
      servico: {
        tipo: "ARTE",
        subTipo: "GRAFICA_RAPIDA",
        servicoID: 1,
      },
      responsavel: "Usuario E2E",
      responsavelUid: uid,
      setoresResponsaveis: ["ARTE"],
      statusAtual: "Iniciado",
      historicoStatus: [],
      prazos: {
        entrega: now,
      },
      tipoDeEntrega: "Entrega",
      criadoEm: now,
      atualizadoEm: now,
    },
    { merge: true }
  );
}

async function main() {
  await ensureUser();
  await seedAtendimento();
  await seedControlePedidos();
  // eslint-disable-next-line no-console
  console.log("Seed do emulador concluido.");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Erro no seed do emulador:", error);
  process.exit(1);
});
