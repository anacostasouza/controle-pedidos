import * as admin from "firebase-admin";

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }

  const db = admin.firestore();
  const snapshot = await db.collection("pedidos").get();

  let updated = 0;
  let skipped = 0;

  const batchSize = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as { nomeCliente?: string; nomeClienteNormalizado?: string };
    const nomeCliente = data.nomeCliente ? String(data.nomeCliente) : "";
    const normalizado = nomeCliente ? normalizarTexto(nomeCliente) : "";

    if (!normalizado || data.nomeClienteNormalizado === normalizado) {
      skipped += 1;
      continue;
    }

    batch.update(doc.ref, { nomeClienteNormalizado: normalizado });
    updated += 1;
    batchCount += 1;

    if (batchCount >= batchSize) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  // eslint-disable-next-line no-console
  console.log(`Backfill completo. Atualizados: ${updated}, ignorados: ${skipped}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Erro no backfill:", error);
  process.exit(1);
});
