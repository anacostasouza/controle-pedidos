import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../services/firebase";

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
        return <div>Carregando...</div>;
    }

    if (!user) return <Navigate to="/" replace />;
    if (!profileComplete) return <Navigate to="/profile-name" replace />;
    if (!authorized) {
        return (
            <div>
                <p>Acesso não autorizado. Faça login com um e-mail permitido.</p>
                <Navigate to="/" replace />
            </div>
        );
    }
    return <Component />;
}