import { Request, Response, NextFunction } from "express";
import * as admin from "firebase-admin";

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

          if (userDoc.exists) {
            const userData = userDoc.data();

            (req as any).user = {
              ...(req as any).user,
              setor: userData?.setor,
              setorName: userData?.setorName,
              displayName: userData?.displayName || decodedToken.name,
            };
          }
        } catch (error) {
          console.warn(
            "Erro ao buscar dados adicionais do usuário:",
            error
          );
        }

        Object.freeze((req as any).user);

        next();
        return;
      } catch (err) {
        res.status(401).json({ message: "Token inválido" });
        return;
      }
    }
    res.status(401).json({ message: "Não autenticado" });
    return;
  } catch (error) {
    // Captura QUALQUER erro não tratado - CRÍTICO para firebase-admin 12.6.0+
    console.error("Erro fatal no authMiddleware:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Erro interno de autenticação" });
    }
  }
}