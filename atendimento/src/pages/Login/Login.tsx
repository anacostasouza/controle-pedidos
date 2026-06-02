import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "../../services/firebase";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ATENDIMENTO_API_BASE_URL } from "../../config/functionsApi";
import "../../styles/Login.css";
import logoImage from "../../assets/logologin.png";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authDenialReason } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isE2E = import.meta.env.VITE_E2E === "true";
  const e2eEmail = import.meta.env.VITE_E2E_EMAIL || "desenhar@gmail.com";
  const e2ePassword = import.meta.env.VITE_E2E_PASSWORD || "Senha123!";

  useEffect(() => {
    const storedError = localStorage.getItem("authError");
    if (storedError) {
      setLoginError(storedError);
      localStorage.removeItem("authError");
    }
  }, []);

  const displayMessage = loginError || authDenialReason;

  const authorizeAndNavigate = async (token: string) => {
    const apiUrl = ATENDIMENTO_API_BASE_URL;

    try {
      const authResponse = await fetch(`${apiUrl}/filaAtendimento`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (authResponse.status === 403) {
        const data = await authResponse.json().catch(() => ({}));
        const message = data.message || "Acesso negado";

        setLoginError(message);
        setIsLoading(false);
        await signOut(auth);
        return;
      }

      const from = location.state?.from?.pathname || "/fila-atendimento";
      navigate(from, { replace: true });
    } catch (error) {
      setIsLoading(false);
      if (import.meta.env.DEV) {
        console.error("Erro ao verificar autorização:", error);
      }

      const from = location.state?.from?.pathname || "/fila-atendimento";
      navigate(from, { replace: true });
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    setIsLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
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
          errorMessage = "Erro de rede. Verifique sua conexão e tente novamente.";
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
          <h1 className="login-subtitle">Atendimento</h1>
          <img
            src={logoImage}
            alt="Logo da aplicação Atendimento"
            className="login-logo-image"
          />
        </div>
      </div>

      <div className="login-container">
        <div className="login-box">
          <h2 className="login-title">Entrar</h2>

          {displayMessage && (
            <div className="login-error-message">
              <h3>Acesso Bloqueado</h3>
              <p>{displayMessage}</p>
            </div>
          )}

          <button
            onClick={handleLogin}
            className="login-button"
            disabled={isLoading}
            aria-label="Entrar com sua conta Google"
          >
            <svg
              className="google-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 21 22"
            >
              <title>Ícone do Google</title>
              <path
                d="M21.0009 10.833C21.0009 9.96998 20.9289 9.33997 20.7739 8.68597H10.715V12.583H16.6199C16.5009 13.551 15.858 15.01 14.429 15.99L14.4089 16.12L17.59 18.535L17.8099 18.556C19.8339 16.725 21.0009 14.03 21.0009 10.833Z"
                fill="#4285F4"
              />
              <path
                d="M10.7139 21.1C13.6069 21.1 16.035 20.167 17.809 18.557L14.4279 15.99C13.5229 16.608 12.3089 17.04 10.7139 17.04C7.88093 17.04 5.47596 15.208 4.61896 12.677L4.49292 12.687L1.18591 15.195L1.14294 15.313C2.90394 18.743 6.52293 21.1 10.7139 21.1Z"
                fill="#34A853"
              />
              <path
                d="M4.62091 12.677C4.39491 12.023 4.26392 11.323 4.26392 10.6C4.26392 9.87698 4.39495 9.17698 4.60895 8.52298L4.60297 8.38397L1.25397 5.83597L1.14496 5.88696C0.418958 7.30996 0.00195312 8.90798 0.00195312 10.6C0.00195312 12.292 0.418958 13.89 1.14496 15.313L4.62091 12.677Z"
                fill="#FBBC05"
              />
              <path
                d="M10.7139 4.15997C12.7259 4.15997 14.0829 5.01196 14.8569 5.72296L17.8809 2.82999C16.0239 1.13799 13.6069 0.0999756 10.7139 0.0999756C6.52393 0.0999756 2.90394 2.45696 1.14294 5.88696L4.60693 8.52298C5.47593 5.99198 7.88093 4.15997 10.7139 4.15997Z"
                fill="#EB4335"
              />
            </svg>
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

export default Login;