import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../services/firebase";
import { Loading } from "../components/Loading/Loading"; 

window.getToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    return token;
  }
  return null;
};

export function ProtectedRoute({ Component }: Readonly<{ Component: React.ComponentType }>) {
    const { user, loading, checkingProfile, profileComplete, authorized } = useAuth();
    
    if (loading || checkingProfile || authorized === null) {
        return <Loading message="Verificando permissões" />;
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
              padding: "20px"
            }}>
                <div style={{ fontSize: "4rem", marginBottom: "20px" }}>🚫</div>
                <h2 style={{ color: "#5f1919", marginBottom: "10px" }}>Acesso não autorizado</h2>
                <p style={{ color: "#666" }}>Faça login com um e-mail permitido.</p>
                <Navigate to="/" replace />
            </div>
        );
    }
    return <Component />;
}