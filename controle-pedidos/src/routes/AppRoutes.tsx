import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { auth } from "../services/firebase";

import "../styles/AppRoutes.css";

import Login from "../pages/Login";
import ProfileNamePage from "../pages/ProfileNamePage";
import Dashboard from "../pages/Dashboard";
import NovoPedido from "../pages/NovoPedido";
import EditarPedido from "../pages/EditarPedido";
import ProfileEdit from "../pages/ProfileEdit";
import RelatoriosPage from "../pages/Relatorios"; 

import type { User } from "firebase/auth";
import type { JSX } from "react/jsx-dev-runtime";

interface UserProfile {
  nome?: string;
  displayName?: string;
  setor: string;
  emailVerified?: boolean;
}

export default function AppRoutes(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
      setLoading(false);
      setProfileComplete(!usuario ? false : profileComplete);
      setCheckingProfile(false);
    });

    return () => unsubscribe();
  }, [profileComplete]);

  useEffect(() => {
    const checkProfileStatus = async () => {
      if (!user) {
        setProfileComplete(false);
        setCheckingProfile(false);
        return;
      }

      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));

        const data = userDoc.data() as UserProfile | undefined;
        const isComplete =
          data &&
          (data.displayName || data.nome) &&
          data.setor &&
          (user.emailVerified || data.emailVerified);

        if (process.env.NODE_ENV !== "production") {
          console.log("Perfil verificado:", isComplete, data);
        }

        setProfileComplete(!!isComplete);
      } catch (error) {
        console.error("Erro ao verificar perfil:", error);
        await signOut(auth);
        setProfileComplete(false);
      } finally {
        setCheckingProfile(false);
      }
    };

    if (user) {
      checkProfileStatus();
    }
  }, [user]);

  if (loading) return <div className="loading">Verificando autenticação...</div>;
  if (user && checkingProfile) return <div className="loading">Verificando perfil do usuário...</div>;

  const renderLoginRoute = (): JSX.Element =>
    user ? <Navigate to="/dashboard" replace /> : <Login />;

  const renderProfileNameRoute = (): JSX.Element => {
    if (!user) return <Navigate to="/" replace />;
    if (profileComplete) return <Navigate to="/dashboard" replace />;
    return <ProfileNamePage />;
  };

  const renderProtectedRoute = (Component: React.ComponentType): JSX.Element => {
    if (!user) return <Navigate to="/" replace />;
    if (!profileComplete) return <Navigate to="/profile-name" replace />;
    return <Component />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={renderLoginRoute()} />
        <Route path="/profile-name" element={renderProfileNameRoute()} />
        <Route path="/dashboard" element={renderProtectedRoute(Dashboard)} />
        <Route path="/novo-pedido" element={renderProtectedRoute(NovoPedido)} />
        <Route path="/editar-pedido/:id" element={renderProtectedRoute(EditarPedido)} />
        <Route path="/profile-edit" element={renderProtectedRoute(ProfileEdit)} />
        <Route path="/relatorios" element={renderProtectedRoute(RelatoriosPage)} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
