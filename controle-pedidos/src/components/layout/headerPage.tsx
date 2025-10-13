import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { auth } from "../../services/firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import "../../styles/HeaderPage.css";
import type { Usuario } from "../../types/Usuario";
import logo from "../../assets/LogoColorida.png";
import { BarChart3 } from "lucide-react";

interface UserProfile {
  nome: Usuario["displayName"];
  setorNome: Usuario["setorNome"];
  setor: Usuario["setor"];
}

const HeaderPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isRelatorios = location.pathname.includes("/relatorios");

  const mostrarRelatorios = (usuario: UserProfile): boolean => {
    const setor = usuario.setorNome?.trim().toLowerCase();
    return setor === "suporte" || setor === "gestão";
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (!user) {
          navigate("/");
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
    };

    fetchUserProfile();
  }, [navigate]);

  const handleProfileClick = () => {
    navigate("/profile-edit");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  if (loading) {
    return <div className="header-page loading">Carregando...</div>;
  }

  return (
    <header className="header-page">
      <div className="header-content">
        <Link to="/dashboard">
          <img src={logo} alt="Logo" className="logo-imagem" title="Dashboard" />
        </Link>

        <h2 className="app-title">
          {isRelatorios ? "Relatórios" : "Controle de Pedidos"}
        </h2>

        <div className="header-actions">
          {userProfile && mostrarRelatorios(userProfile) && !isRelatorios && (
            <button
              className="header-icon-button"
              title="Ir para Relatórios"
              onClick={() => navigate("/relatorios")}
            >
              <BarChart3 size={22} />
            </button>
          )}

          {userProfile && (
            <button
              onClick={handleProfileClick}
              className="user-profile-button"
            >
              <span className="user-name">{userProfile.nome}</span>
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
