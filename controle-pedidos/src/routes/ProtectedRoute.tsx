import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../services/firebase";
import { Loading } from "../components/Loading/Loading";
import { useEffect, useState } from "react"; 

window.getToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    return token;
  }
  return null;
};

export function ProtectedRoute({ Component }: Readonly<{ Component: React.ComponentType }>) {
    const navigate = useNavigate();
    const { user, loading, checkingProfile, profileComplete, authorized, accountDisabled, authDenialReason } = useAuth();
    const [timeoutReached, setTimeoutReached] = useState(false);
    const [errorLoading, setErrorLoading] = useState(false);

    // Timeout após 5 segundos verificando - evita ficar preso
    useEffect(() => {
        const timer = setTimeout(() => {
            if (authorized === null && !accountDisabled) {
                setErrorLoading(true);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [authorized, accountDisabled]);

    // Se ainda carregando após timeout, redirecionar
    useEffect(() => {
        if (errorLoading && authorized === null) {
            const timer = setTimeout(() => {
                setTimeoutReached(true);
                navigate("/", { replace: true });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [errorLoading, authorized, navigate]);
    
    // Se conta foi desativada, redirecionar para login (mensagem será mostrada lá)
    if (accountDisabled) {
        return <Navigate to="/" replace />;
    }
    
    if (timeoutReached) return <Navigate to="/" replace />;
    
    if (loading || checkingProfile || authorized === null) {
        return (
            <Loading 
                message={errorLoading ? "Verificação de acesso demorou muito. Redirecionando..." : "Verificando permissões"} 
            />
        );
    }

    if (!user) return <Navigate to="/" replace />;
    if (!profileComplete) return <Navigate to="/profile-name" replace />;
    
    if (!authorized) {
        return (
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "center", 
              alignItems: "center", 
              minHeight: "100vh",
              textAlign: "center",
              padding: "20px",
              backgroundColor: "#fef3f3"
            }}>
                <div style={{ fontSize: "4rem", marginBottom: "20px" }}>🚫</div>
                <h2 style={{ color: "#5f1919", marginBottom: "10px", fontSize: "1.8rem" }}>Acesso Não Autorizado</h2>
                <p style={{ color: "#666", marginBottom: "20px", fontSize: "1.1rem" }}>
                    {authDenialReason || "Seu e-mail não tem permissão para acessar este sistema."}
                </p>
                <p style={{ color: "#888", fontSize: "0.95rem", marginBottom: "20px" }}>
                    Entre em contato com o administrador se acredita que isso é um erro.
                </p>
                <button 
                    onClick={() => navigate("/", { replace: true })}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: "#5f1919",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "1rem",
                        fontFamily: "Comfortaa, sans-serif"
                    }}
                >
                    Voltar ao Login
                </button>
            </div>
        );
    }
    return <Component />;
}