import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { lazy, Suspense, useEffect, useState } from "react";

import { auth } from "../services/firebase";
import { useAuth } from "../context/AuthContext";

import "../styles/AppRoutes.css";

import { ProtectedRoute } from "./ProtectedRoute";
import { Loading } from "../components/Loading/Loading";

const Login = lazy(() => import("../pages/Login"));
const ProfileNamePage = lazy(() => import("../pages/ProfileNamePage"));
const Dashboard = lazy(() => import("../pages/Dashboard/Dashboard"));
const NovoPedido = lazy(() => import("../pages/NovoPedido"));
const EditarPedido = lazy(() => import("../pages/EditarPedidos/EditarPedido"));
const ProfileEdit = lazy(() => import("../pages/ProfileEdit/ProfileEdit"));
const RelatoriosPage = lazy(() => import("../pages/Relatorios/Relatorios"));

import type { User } from "firebase/auth";
import type { JSX } from "react/jsx-dev-runtime";

declare global {
  interface Window {
    getToken: () => Promise<string | null>;
  }
}

window.getToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    return token;
  }
  return null;
};

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
  const [, setCheckingProfile] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        setProfileComplete(!!isComplete);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Erro ao verificar perfil:", error);
        }
        await signOut(auth);
        setProfileComplete(false);
      } finally {
        setCheckingProfile(false);
      }
    };
    if (user) {
      setCheckingProfile(true);
      checkProfileStatus();
    }
  }, [user]);

  if (loading) {
    return <Loading message="Verificando autenticação" />;
  }

  const renderProfileNameRoute = (): JSX.Element => {
    if (!user) return <Navigate to="/" replace />;
    if (profileComplete) return <Navigate to="/dashboard" replace />;
    return <ProfileNamePage />;
  };

  function LoginRoute() {
    const location = useLocation();
    const { accountDisabled } = useAuth();
    
    // Se conta foi desativada, permitir mostrar login novamente
    if (accountDisabled) {
      return <Login />;
    }
    
    if (user && location.state?.fromNovoPedido) {
      return <Navigate to="/novo-pedido" replace />;
    }
    return user ? <Navigate to="/dashboard" replace /> : <Login />;
  }

  function ProfileNameRoute() {
    if (!user) return <Navigate to="/" replace />;
    if (profileComplete) return <Navigate to="/dashboard" replace />;
    return <ProfileNamePage />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<Loading message="Carregando..." />}>
        <Routes>
          <Route path="/" element={<LoginRoute />} />
          <Route path="/profile-name" element={<ProtectedRoute Component={ProfileNameRoute} />} />
          <Route path="/dashboard" element={<ProtectedRoute Component={Dashboard} />} />
          <Route path="/novo-pedido" element={<ProtectedRoute Component={NovoPedido} />} />
          <Route
            path="/editar-pedido/:id"
            element={<ProtectedRoute Component={EditarPedido} />}
          />
          <Route
            path="/profile-edit"
            element={<ProtectedRoute Component={ProfileEdit} />}
          />
          <Route
            path="/relatorios"
            element={<ProtectedRoute Component={RelatoriosPage} />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
