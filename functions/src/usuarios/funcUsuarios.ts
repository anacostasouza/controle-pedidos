import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express from "express";
import {
  authMiddleware,
  createSetorMiddleware,
  invalidateUserAuthCache,
} from "../utils/authMiddleware";
import {
  applySecurityHeaders,
  applyStandardCors,
  createAuthenticatedRateLimiter,
  createDefaultRateLimiter,
} from "../utils/httpMiddleware";
import { logDev, logError } from "../utils/logger";

export const appUsuarios = express();
appUsuarios.set("trust proxy", 1);
const db = admin.firestore();
const adminAuth = admin.auth();

const setorLabels: Record<string, string> = {
  PRODUCAO_LOJA: "Produção Loja",
  ARTE: "Arte",
  GALPAO: "Galpão",
  RH: "RH",
  FINANCEIRO: "Financeiro",
  COMERCIAL: "Comercial",
  SUPORTE: "Suporte",
  BALCAO: "Balcão",
  GESTAO: "Gestão",
  CAIXA: "Caixa",
};

applyStandardCors(appUsuarios, { preflightMode: "send" });
applySecurityHeaders(appUsuarios);

appUsuarios.use(createDefaultRateLimiter({ max: 600 }));

appUsuarios.use(express.json());

const router = express.Router();
const authRateLimiter = createAuthenticatedRateLimiter({ max: 250 });
const isAdminMiddleware = createSetorMiddleware(
  ["SUPORTE", "GESTAO"],
  "Acesso negado. Apenas admins podem gerenciar usuários."
);

// GET /usuarios/listar - Listar todos os usuários
router.get("/listar", authMiddleware, authRateLimiter, isAdminMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const usersSnapshots = await db.collection("usuarios").get();
    const users = usersSnapshots.docs.map((doc) => ({
      usuarioID: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(users);
  } catch (error) {
    logError("Erro ao listar usuários:", error);
    res.status(500).json({ message: "Erro ao listar usuários." });
  }
});

// GET /usuarios/:uid - Obter dados de um usuário específico
router.get("/:uid", authMiddleware, authRateLimiter, isAdminMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { uid } = req.params;
    const userDoc = await db.collection("usuarios").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    res.status(200).json({
      usuarioID: uid,
      ...userDoc.data(),
    });
  } catch (error) {
    logError("Erro ao obter usuário:", error);
    res.status(500).json({ message: "Erro ao obter usuário." });
  }
});

// POST /usuarios/criar - Criar novo usuário
router.post("/criar", authMiddleware, authRateLimiter, isAdminMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { email, displayName, setor } = req.body;

    // Validações
    if (!email || !displayName || !setor) {
      return res.status(400).json({ message: "Email, nome e setor são obrigatórios." });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email inválido." });
    }

    // Validar whitelist de emails
    const allowedSuffixes = [
      "desenhar@gmail.com",
      "@desenhardigital.com.br",
      "@copiadoradesenhar.com.br",
    ];
    const isEmailAllowed = allowedSuffixes.some((suffix) => email.endsWith(suffix));
    if (!isEmailAllowed) {
      return res.status(400).json({ 
        message: "Email não está na whitelist. Use domínios autorizados." 
      });
    }

    // Verificar se já existe no Firestore
    const existingUsers = await db.collection("usuarios").where("email", "==", email).get();
    if (!existingUsers.empty) {
      return res.status(400).json({ message: "Email já registrado no sistema." });
    }

    // Verificar se já existe no Firebase Auth
    let uid: string;
    try {
      const existingUser = await adminAuth.getUserByEmail(email);
      uid = existingUser.uid;
    } catch (error: Error | unknown) {
      if (error instanceof Error && error.message.includes("user-not-found")) {
        // Usuário não existe no Auth - criar novo
        // Sem senha, pois usamos apenas Google Login
        const userRecord = await adminAuth.createUser({
          email,
          displayName,
        });
        uid = userRecord.uid;
        logDev(`Novo usuário criado no Firebase Auth: ${email} (${uid})`);
      } else {
        throw error;
      }
    }

    // Criar documento no Firestore com o UID do Firebase Auth
    await db.collection("usuarios").doc(uid).set({
      email,
      displayName,
      setor,
      setorNome: setorLabels[setor] ?? setor,
      statusConta: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    res.status(201).json({
      message: "Usuário criado com sucesso.",
      usuarioID: uid,
      email,
      displayName,
      setor,
    });
  } catch (error: Error | unknown) {
    logError("Erro ao criar usuário:", error);

    if (error instanceof Error && error.message.includes("email-already-exists")) {
      return res.status(400).json({ message: "Este email já está registrado." });
    }

    res.status(500).json({ message: "Erro ao criar usuário." });
  }
});

// PATCH /usuarios/:uid - Atualizar usuário
router.patch("/:uid", authMiddleware, authRateLimiter, isAdminMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { uid } = req.params;
    const { displayName, setor, statusConta } = req.body;

    const userDoc = await db.collection("usuarios").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (displayName !== undefined) {
      if (typeof displayName !== "string" || !displayName.trim() || displayName.trim().length > 120) {
        return res.status(400).json({ message: "Nome inválido (máximo 120 caracteres)." });
      }
      updateData.displayName = displayName.trim();
      // Nota: Não atualizamos no Firebase Auth pois o sistema usa apenas Google Login
    }

    if (setor !== undefined) {
      if (typeof setor !== "string" || !Object.prototype.hasOwnProperty.call(setorLabels, setor)) {
        return res.status(400).json({ message: "Setor inválido." });
      }
      updateData.setor = setor;
      updateData.setorNome = setorLabels[setor];
    }

    if (statusConta !== undefined) {
      if (typeof statusConta !== "boolean") {
        return res.status(400).json({ message: "statusConta deve ser booleano." });
      }
      updateData.statusConta = statusConta;
    }

    await db.collection("usuarios").doc(uid).update(updateData);
    invalidateUserAuthCache(uid);

    res.status(200).json({
      message: "Usuário atualizado com sucesso.",
      usuarioID: uid,
      ...updateData,
    });
  } catch (error) {
    logError("Erro ao atualizar usuário:", error);
    res.status(500).json({ message: "Erro ao atualizar usuário." });
  }
});

// PATCH /usuarios/:uid/desativar - Desativar usuário (soft delete)
router.patch("/:uid/desativar", authMiddleware, authRateLimiter, isAdminMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { uid } = req.params;

    const userDoc = await db.collection("usuarios").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const userData = userDoc.data();
    if (!userData) {
      return res.status(404).json({ message: "Dados do usuário não encontrados." });
    }

    // Soft delete: desativar em vez de deletar
    await db.collection("usuarios").doc(uid).update({
      statusConta: false,
      updatedAt: Date.now(),
    });
    invalidateUserAuthCache(uid);

    res.status(200).json({
      message: "Usuário desativado com sucesso.",
      usuarioID: uid,
    });
  } catch (error) {
    logError("Erro ao desativar usuário:", error);
    res.status(500).json({ message: "Erro ao desativar usuário." });
  }
});

// PATCH /usuarios/:uid/ativar - Ativar usuário (reverter soft delete)
router.patch("/:uid/ativar", authMiddleware, authRateLimiter, isAdminMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { uid } = req.params;

    const userDoc = await db.collection("usuarios").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const userData = userDoc.data();
    if (!userData) {
      return res.status(404).json({ message: "Dados do usuário não encontrados." });
    }

    await db.collection("usuarios").doc(uid).update({
      statusConta: true,
      updatedAt: Date.now(),
    });
    invalidateUserAuthCache(uid);

    res.status(200).json({
      message: "Usuário ativado com sucesso.",
      usuarioID: uid,
    });
  } catch (error) {
    logError("Erro ao ativar usuário:", error);
    res.status(500).json({ message: "Erro ao ativar usuário." });
  }
});

// DELETE /usuarios/:uid - Deletar usuário permanentemente
router.delete("/:uid", authMiddleware, authRateLimiter, isAdminMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { uid } = req.params;
    const currentUid = (req as any).user?.uid;

    if (uid === currentUid) {
      return res.status(400).json({ message: "Você não pode deletar sua própria conta." });
    }

    const userDoc = await db.collection("usuarios").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    // Deletar do Firestore
    await db.collection("usuarios").doc(uid).delete();
    invalidateUserAuthCache(uid);

    // Tentar deletar do Firebase Auth (se existir)
    // Nota: Depois que um usuário faz login com Google, seu email fica no Firebase Auth
    try {
      await adminAuth.deleteUser(uid);
      logDev(`Usuário ${uid} deletado da autenticação.`);
    } catch (error: Error | unknown) {
      if (error instanceof Error && error.message.includes("user-not-found")) {
        // Usuário não estava no Auth (nunca havia feito login) - é OK
        logDev(`Usuário ${uid} não encontrado no Firebase Auth (nunca fez login).`);
      } else {
        // Outro erro ao deletar do Auth
        logError(`Aviso ao deletar usuário ${uid} do Auth:`, error);
        // Não falha a operação inteira, apenas registra o aviso
      }
    }

    res.status(200).json({
      message: "Usuário deletado com sucesso de todas as bases.",
      usuarioID: uid,
    });
  } catch (error) {
    logError("Erro ao deletar usuário:", error);
    res.status(500).json({ message: "Erro ao deletar usuário." });
  }
});

appUsuarios.use("/usuarios", router);

export const usuariosApi = onRequest(
  { region: "southamerica-east1" },
  appUsuarios
);
