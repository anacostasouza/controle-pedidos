import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { auth } from "../services/firebase";
import "../styles/index.css";

import Login from "../pages/Login";
import ProfileNamePage from "../pages/ProfileNamePage";
import Dashboard from "../pages/Dashboard";
import NovoPedido from "../pages/NovoPedido";

import type { User } from "firebase/auth";
import type { JSX } from "react/jsx-dev-runtime";

export default function AppRoutes(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
      setLoading(false);

      if (!usuario) {
        setCheckingProfile(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkProfileStatus = async () => {
      if (!user) {
        setCheckingProfile(false);
        return;
      }

      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));

        const data = userDoc.data();
        const isComplete = data && (
          (typeof data.displayName === "string" && typeof data.setor === "string") ||
          (typeof data.nome === "string" && typeof data.setor === "string")
        );

        if (process.env.NODE_ENV !== "production") {
          console.log("Perfil verificado:", isComplete, data);
        }

        setProfileComplete(Boolean(isComplete));
      } catch (error) {
        console.error("Erro ao verificar perfil:", error);
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
    user ? <Navigate to="/dashboard" /> : <Login />;

  const renderProfileNameRoute = (): JSX.Element => {
    if (!user) return <Navigate to="/" />;
    if (profileComplete) return <Navigate to="/dashboard" />;
    return <ProfileNamePage />;
  };

  const renderDashboardRoute = (): JSX.Element => {
    if (!user) return <Navigate to="/" />;
    if (!profileComplete) return <Navigate to="/profile-name" />;
    return <Dashboard />;
  };

  const renderNovosPedidosRoute = (): JSX.Element => {
    if (!user) return <Navigate to="/" />;
    if (!profileComplete) return <Navigate to="/profile-name" />;
    return <NovoPedido />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={renderLoginRoute()} />
        <Route path="/profile-name" element={renderProfileNameRoute()} />
        <Route path="/dashboard" element={renderDashboardRoute()} />
        <Route path="/novos-pedidos" element={renderNovosPedidosRoute()} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
