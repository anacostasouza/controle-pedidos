import express from "express";
import * as admin from "firebase-admin";
import { ensureTagPlusAccessToken } from "../../tagplus/tagplusShared";
import { logError } from "../../utils/logger";
import { FinanceiroClient } from "../FinanceiroClient";
import type { AuxiliaresFinanceiro } from "../financeiroDomain";

const META_COLLECTION = "financeiro_meta";
const AUXILIARES_DOC = "auxiliares";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export function createAuxiliaresRouter(): express.Router {
  const router = express.Router();

  // GET /financeiro/auxiliares — Firestore cache 24h
  router.get("/auxiliares", async (req, res) => {
    try {
      const db = admin.firestore();
      const docRef = db.collection(META_COLLECTION).doc(AUXILIARES_DOC);
      const snap = await docRef.get();

      if (snap.exists) {
        const data = snap.data() as AuxiliaresFinanceiro & {
          _cached_at: string;
        };
        const cachedAt = new Date(data._cached_at).getTime();
        const age = Date.now() - cachedAt;

        if (age < CACHE_TTL_MS) {
          // Cache válido
          const { _cached_at, ...auxiliares } = data;
          return res.status(200).json(auxiliares);
        }
      }

      // Cache expirado ou inexistente — busca na TagPlus
      const storedTokens = await ensureTagPlusAccessToken();
      let accessToken =
        process.env.TAGPLUS_ACCESS_TOKEN || storedTokens?.access_token || "";

      if (!accessToken) {
        return res
          .status(500)
          .json({ message: "TAGPLUS_ACCESS_TOKEN indisponível" });
      }

      const buscar = async (token: string): Promise<AuxiliaresFinanceiro> => {
        const client = new FinanceiroClient({ accessToken: token });
        return client.buscarAuxiliares();
      };

      let auxiliares: AuxiliaresFinanceiro;
      try {
        auxiliares = await buscar(accessToken);
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 401) {
          throw err;
        }
        const refreshed = await ensureTagPlusAccessToken({
          forceRefresh: true,
        });
        const refreshedToken =
          process.env.TAGPLUS_ACCESS_TOKEN || refreshed?.access_token || "";
        if (!refreshedToken) {
          throw new Error("Token indisponível após refresh");
        }
        auxiliares = await buscar(refreshedToken);
      }

      // Salva no Firestore com timestamp
      await docRef.set({
        ...auxiliares,
        _cached_at: new Date().toISOString(),
      });

      return res.status(200).json(auxiliares);
    } catch (error) {
      logError(
        "[financeiro] Erro ao buscar auxiliares:",
        error instanceof Error ? error.message : error
      );
      return res.status(500).json({ message: "Erro ao buscar auxiliares" });
    }
  });

  return router;
}
