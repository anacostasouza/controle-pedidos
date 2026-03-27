import { Request, Response, NextFunction } from "express";
import * as admin from "firebase-admin";
import { logError, logSecurityEvent } from "./logger";

const allowedSuffixes = [
  "desenhar@gmail.com",
  "@desenhardigital.com.br",
  "@copiadoradesenhar.com.br",
];

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const email = decodedToken.email || "";
        const isAllowed = allowedSuffixes.some((suffix) =>
          email.endsWith(suffix)
        );
        if (!isAllowed) {
          logSecurityEvent("auth.denied.email_not_allowed", {
            uid: decodedToken.uid,
          });
          res.status(403).json({ message: "Acesso negado" });
          return;
        }

        (req as any).user = decodedToken;

        try {
          const db = admin.firestore();
          const userDoc = await db
            .collection("usuarios")
            .doc(decodedToken.uid)
            .get();

          if (!userDoc.exists) {
            logSecurityEvent("auth.denied.user_not_registered", {
              uid: decodedToken.uid,
            });
            res.status(403).json({ message: "Usuário não cadastrado no sistema" });
            return;
          }

          const userData = userDoc.data();

          // Verificar se o usuário está ativo
          if (userData?.statusConta === false) {
            logSecurityEvent("auth.denied.user_disabled", {
              uid: decodedToken.uid,
            });
            res.status(403).json({ message: "Conta desativada. Entre em contato com o administrador." });
            return;
          }

          (req as any).user = {
            ...(req as any).user,
            setor: userData?.setor,
            setorNome: userData?.setorNome,
            setorName: userData?.setorNome,
            displayName: userData?.displayName || decodedToken.name,
          };
        } catch (error) {
          logError("Erro ao buscar dados adicionais do usuário:", error);
          logSecurityEvent("auth.denied.authorization_service_unavailable", {
            uid: decodedToken.uid,
          }, "error");
          res.status(503).json({ message: "Serviço de autorização temporariamente indisponível" });
          return;
        }

        Object.freeze((req as any).user);

        next();
        return;
      } catch (err) {
        logSecurityEvent("auth.denied.invalid_token");
        res.status(401).json({ message: "Token inválido" });
        return;
      }
    }
    logSecurityEvent("auth.denied.missing_token");
    res.status(401).json({ message: "Não autenticado" });
    return;
  } catch (error) {
    // Captura QUALQUER erro não tratado - CRÍTICO para firebase-admin 12.6.0+
    logError("Erro fatal no authMiddleware:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Erro interno de autenticação" });
    }
  }
}