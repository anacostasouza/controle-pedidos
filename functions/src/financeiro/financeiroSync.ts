import * as admin from "firebase-admin";
import { ensureTagPlusAccessToken } from "../tagplus/tagplusShared";
import { FinanceiroClient } from "./FinanceiroClient";
import type { LancamentoFinanceiro, SyncMeta } from "./financeiroDomain";

const DB_COLLECTION = "financeiro_cache";
const META_COLLECTION = "financeiro_meta";
const SYNC_META_DOC = "sync";

let isSyncInProgress = false;

type MemoryCacheEntry = {
  items: LancamentoFinanceiro[];
  expiresAt: number;
};

let memoryCache: MemoryCacheEntry | null = null;
let memoryCachePromise: Promise<LancamentoFinanceiro[]> | null = null;

function getMemoryCacheTtlMs(): number {
  const configured = process.env.FINANCEIRO_MEMORY_CACHE_TTL_MS;
  if (configured !== undefined) {
    const parsed = Number(configured);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
  return process.env.NODE_ENV === "test" ? 0 : 45_000;
}

export function invalidateFinanceiroMemoryCache(): void {
  memoryCache = null;
  memoryCachePromise = null;
}

export async function getCachedLancamentos(): Promise<LancamentoFinanceiro[]> {
  const ttlMs = getMemoryCacheTtlMs();
  const now = Date.now();
  if (ttlMs > 0 && memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.items;
  }

  if (memoryCachePromise) {
    return memoryCachePromise;
  }

  memoryCachePromise = (async () => {
    const snapshot = await admin.firestore().collection(DB_COLLECTION).get();
    const items: LancamentoFinanceiro[] = [];
    for (const doc of snapshot.docs) {
      items.push(doc.data() as LancamentoFinanceiro);
    }

    if (ttlMs > 0) {
      memoryCache = {
        items,
        expiresAt: Date.now() + ttlMs,
      };
    } else {
      memoryCache = null;
    }

    return items;
  })();

  try {
    return await memoryCachePromise;
  } finally {
    memoryCachePromise = null;
  }
}

export async function syncFinanceiro(force = false): Promise<void> {
  // 1. Trava de concorrência em memória
  if (!force && isSyncInProgress) {
    console.info("[financeiroSync] Sincronização já em andamento (lock de memória). Ignorando requisição concorrente.");
    return;
  }

  const db = admin.firestore();
  const metaRef = db.collection(META_COLLECTION).doc(SYNC_META_DOC);

  // 2. Trava de concorrência no Firestore
  if (!force) {
    try {
      const metaSnap = await metaRef.get();
      if (metaSnap.exists) {
        const currentMeta = metaSnap.data();
        if (currentMeta?.status === "running" && currentMeta?.updatedAt) {
          const runningAgeMs = Date.now() - new Date(currentMeta.updatedAt).getTime();
          if (runningAgeMs < 2 * 60 * 1000) {
            console.info("[financeiroSync] Sincronização ativa no Firestore (< 2 min). Ignorando.");
            return;
          }
        }
      }
    } catch (err) {
      // Ignora erro de leitura inicial
    }
  }

  isSyncInProgress = true;

  // Marca status 'running'
  await metaRef.set(
    { status: "running", updatedAt: new Date().toISOString() },
    { merge: true }
  );

  let totalSynced = 0;

  try {
    // 3. Obtém access token
    const storedTokens = await ensureTagPlusAccessToken();
    const accessToken =
      process.env.TAGPLUS_ACCESS_TOKEN || storedTokens?.access_token || "";

    if (!accessToken) {
      throw new Error("TAGPLUS_ACCESS_TOKEN indisponível para sync financeiro");
    }

    let client = new FinanceiroClient({ accessToken });

    let page = 1;
    const limit = 100;
    const maxPages = 15; // Sincroniza os 1.500 lançamentos mais recentes por rodada
    let hasMore = true;

    // 4. Pagina com pausas preventivas
    while (hasMore && page <= maxPages) {
      let result;
      try {
        result = await client.buscarFinanceiros({
          page,
          limit,
        });
      } catch (err: any) {
        // Se 401 (token expirado), tenta refresh
        if (err?.response?.status === 401) {
          console.warn("[financeiroSync] 401 recebido. Forçando renovação de token...");
          const refreshed = await ensureTagPlusAccessToken({ forceRefresh: true });
          const refreshedToken =
            process.env.TAGPLUS_ACCESS_TOKEN || refreshed?.access_token || "";
          if (!refreshedToken) throw err;
          client = new FinanceiroClient({ accessToken: refreshedToken });
          result = await client.buscarFinanceiros({
            page,
            limit,
          });
        } else {
          throw err;
        }
      }

      const { items, totalPages } = result;

      if (!items || items.length === 0) {
        hasMore = false;
        break;
      }

      // 5. Batch write no Firestore
      const syncedAt = new Date().toISOString();
      const batchSize = 400;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = db.batch();
        const slice = items.slice(i, i + batchSize);
        for (const item of slice) {
          const docRef = db.collection(DB_COLLECTION).doc(String(item.id));
          batch.set(docRef, { ...item, _synced_at: syncedAt }, { merge: true });
        }
        await batch.commit();
      }

      totalSynced += items.length;
      console.info(`[financeiroSync] Página ${page}/${totalPages} sincronizada com sucesso (${items.length} itens salvos).`);

      if (page >= totalPages || items.length < limit || page >= maxPages) {
        hasMore = false;
      } else {
        page++;
        // Pausa preventiva de 800ms entre páginas
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    // 6. Salva meta com sucesso
    const now = new Date();
    const nextSync = new Date(now.getTime() + 15 * 60 * 1000); // +15 min
    await metaRef.set({
      lastSyncAt: now.toISOString(),
      totalSynced,
      nextSyncAt: nextSync.toISOString(),
      status: "ok",
      updatedAt: now.toISOString(),
    });

    console.info(`[financeiroSync] Sincronização concluída com sucesso! Total: ${totalSynced} lançamentos.`);
    invalidateFinanceiroMemoryCache();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[financeiroSync] Erro na sincronização:", msg);
    await metaRef.set(
      {
        status: "error",
        error: msg,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    throw error;
  } finally {
    isSyncInProgress = false;
  }
}

export async function getSyncMeta(): Promise<SyncMeta> {
  const db = admin.firestore();
  const snap = await db
    .collection(META_COLLECTION)
    .doc(SYNC_META_DOC)
    .get();

  if (!snap.exists) {
    return {
      lastSyncAt: null,
      totalSynced: 0,
      nextSyncAt: null,
      status: "ok",
    };
  }

  const data = snap.data() as Partial<SyncMeta>;
  return {
    lastSyncAt: data.lastSyncAt ?? null,
    totalSynced: data.totalSynced ?? 0,
    nextSyncAt: data.nextSyncAt ?? null,
    status: data.status ?? "ok",
  };
}

export async function upsertFinanceiroCacheItem(item: LancamentoFinanceiro): Promise<void> {
  await admin
    .firestore()
    .collection(DB_COLLECTION)
    .doc(String(item.id))
    .set({ ...item, _synced_at: new Date().toISOString() }, { merge: true });
  invalidateFinanceiroMemoryCache();
}

export async function invalidarCacheItem(id: number): Promise<void> {
  await admin.firestore().collection(DB_COLLECTION).doc(String(id)).delete();
  invalidateFinanceiroMemoryCache();
}
