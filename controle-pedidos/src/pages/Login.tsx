import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "../services/firebase";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CONTROLE_PEDIDOS_API_BASE_URL } from "../config/functionsApi";
import "../styles/Login.css";
import logoImage from "../assets/logologin.png";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authDenialReason } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isE2E = import.meta.env.VITE_E2E === "true";
  const e2eEmail = import.meta.env.VITE_E2E_EMAIL || "desenhar@gmail.com";
  const e2ePassword = import.meta.env.VITE_E2E_PASSWORD || "Senha123!";

  // Carregar mensagem do localStorage se existir
  useEffect(() => {
    const storedError = localStorage.getItem("authError");
    if (storedError) {
      setLoginError(storedError);
      localStorage.removeItem("authError");
    }
  }, []);

  // Mostrar mensagem de erro do contexto (conta desativada/bloqueada)
  const displayMessage = loginError || authDenialReason;

  const authorizeAndNavigate = async (token: string) => {
    const apiUrl = CONTROLE_PEDIDOS_API_BASE_URL;

    try {
      const authResponse = await fetch(
        `${apiUrl}/dashboard/buscarPedidos?porPagina=1`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (authResponse.status === 403) {
        const data = await authResponse.json().catch(() => ({}));
        const message = data.message || "Acesso negado";

        setLoginError(message);
        setIsLoading(false);
        await signOut(auth);

        return;
      }

      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (error) {
      setIsLoading(false);
      if (import.meta.env.DEV) {
        console.error("Erro ao verificar autorização:", error);
      }
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    setIsLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Verificar autorização ANTES de navegar
      const token = await user.getIdToken();
      await authorizeAndNavigate(token);
    } catch (error) {
      setIsLoading(false);
      
      if (import.meta.env.DEV) {
        console.error("Erro ao logar:", error);
      }

      let errorMessage = "Falha no login com Google. Tente novamente.";
      if (typeof error === "object" && error !== null && "code" in error) {
        const errorCode = (error as { code: string }).code;
        if (errorCode === "auth/popup-closed-by-user") {
          errorMessage = "Login cancelado.";
        } else if (errorCode === "auth/network-request-failed") {
          errorMessage =
            "Erro de rede. Verifique sua conexão e tente novamente.";
        }
      }

      setLoginError(errorMessage);
    }
  };

  const handleE2ELogin = async () => {
    setLoginError(null);
    setIsLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, e2eEmail, e2ePassword);
      const token = await result.user.getIdToken();
      await authorizeAndNavigate(token);
    } catch (error) {
      setIsLoading(false);
      if (import.meta.env.DEV) {
        console.error("Erro ao logar no e2e:", error);
      }
      setLoginError("Falha no login de teste.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-leftside">
        <div className="container-subtitle">
          <h1 className="login-subtitle">Controle de Pedidos</h1>
          <img
            src={logoImage}
            alt="Logo da aplicação Controle de Pedidos"
            className="login-logo-image"
          />
        </div>
      </div>

      <div className="login-container">
        <div className="login-box">
          <h2 className="login-title">Entrar</h2>
          
          {displayMessage && (
            <div style={{
              backgroundColor: "#ffe6e6",
              border: "1px solid #ffcccc",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "20px"
            }}>
              <h3>
                Acesso Bloqueado
              </h3>
              <p>
                {displayMessage}
              </p>
            </div>
          )}
          
          <button
            onClick={handleLogin}
            className="login-button"
            disabled={isLoading}
            aria-label="Entrar com sua conta Google"
          >
            {isLoading ? "Verificando..." : "Entrar com Google"}
          </button>
          {isE2E && (
            <button
              onClick={handleE2ELogin}
              className="login-button"
              disabled={isLoading}
              data-testid="e2e-login"
            >
              Entrar com teste
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
