import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../services/firebase";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/Login.css";
import logoImage from "../assets/logologin.png";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);

    try {
      await signInWithPopup(auth, provider);

      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (error) {
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
          {loginError && <p className="login-error-message">{loginError}</p>}
          <button
            onClick={handleLogin}
            className="login-button"
            aria-label="Entrar com sua conta Google"
          >
            {/* ...SVG do Google... */}
            Entrar com Google
          </button>
        </div>
      </div>
    </div>
  );
}
