import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import logo from "../../assets/logo.png";
import "../../styles/headerPage.css";

interface UserProfile {
  nome: string;
  setorNome: string;
  setor: string;
}

const HeaderPage: React.FC = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
        setLoading(false);
        return;
      }
      const db = getFirestore();
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserProfile({
          nome: data.displayName ?? "Usuário",
          setorNome: data.setorNome ?? "Sem setor",
          setor: data.setor ?? "",
        });
      } else {
        setUserProfile({
          nome: "Usuário",
          setorNome: "Sem setor",
          setor: "",
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleProfileClick = () => {
    navigate("/profile-edit");
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const isFilaAtendimento = location.pathname.includes("/fila-atendimento");
  const isDashboard = location.pathname.includes("/dashboard");

  if (loading) {
    return <div className="header-page loading">Carregando...</div>;
  }

  return (
    <header className="header-page">
      <div className="header-content">

        {isDashboard ? (
          <Link to="/fila-atendimento">
            <img
              src={logo}
              alt="Logo"
              className="logo-imagem"
              title="Fila de Atendimento"
            />
          </Link>
        ) : isFilaAtendimento ? (
          <Link to="/dashboard">
            <img
              src={logo}
              alt="Logo"
              className="logo-imagem"
              title="Dashboard"
            />
          </Link>
        ) : null}

        <h2 className="app-title">
          {isFilaAtendimento ? "Fila de Atendimento" : isDashboard ? "Dashboard" : "Sistema de Atendimento"}
        </h2>

        <div className="header-actions">
          {userProfile && (
            <button
              onClick={handleProfileClick}
              className="user-profile-button"
            >
              <span className="user-name-header">{userProfile.nome}</span>
              <span className="user-role">{userProfile.setorNome}</span>
            </button>
          )}

          <button onClick={handleLogout} className="logout-button">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-log-out"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="logout-text">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default HeaderPage;
