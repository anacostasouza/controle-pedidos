import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { auth } from "../../services/firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth"; // Importe signOut
import "../../styles/HeaderPage.css";
import type { Usuario } from "../../types/Usuario";
import logo from "../../assets/LogoColorida.png";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isRelatorios = location.pathname.includes("/relatorios");

  const mostrarRelatorios = (usuario: UserProfile): boolean => {
    const setor = usuario.setorNome?.trim().toLowerCase();
    return setor === "suporte" || setor === "gestão";
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
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
      } catch (error) {
        console.error("Erro ao buscar perfil:", error);
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleProfileClick = () => {
    navigate("/profile-edit");
    setIsDropdownOpen(false);
  };

  const handleToggleClick = () => {
    if (userProfile && mostrarRelatorios(userProfile)) {
      navigate(isRelatorios ? "/dashboard" : "/relatorios");
    }
    setIsDropdownOpen(false);
  };

  const handleMouseEnterDropdown = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsDropdownOpen(true);
  };

  const handleMouseLeaveDropdown = () => {
    timeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 200);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      // Opcional: exibir uma mensagem de erro para o usuário
    }
  };

  if (loading) {
    return <div className="header-page loading">Carregando...</div>;
  }

  return (
    <header className="header-page">
      <div className="header-content">
        <Link to={"/dashboard"}>
          <img src={logo} alt="Logo" className="logo-imagem" />
        </Link>
        <div
          className={`app-title-dropdown ${isDropdownOpen ? "open" : ""}`}
          onMouseEnter={handleMouseEnterDropdown}
          onMouseLeave={handleMouseLeaveDropdown}
        >
          <h2 className="app-title">
            <span className="link-dashboard" onClick={handleToggleClick}>
              {isRelatorios ? "Relatórios" : "Controle de Pedidos"}
            </span>
          </h2>
        </div>

        {userProfile && (
          <div className="dropdown-content">
            <button
              onClick={handleToggleClick}
              className="dropdown-option"
              disabled={!mostrarRelatorios(userProfile)}
              title={
                mostrarRelatorios(userProfile)
                  ? ""
                  : "Acesso restrito ao setor Suporte ou Gestão"
              }
            >
              {isRelatorios ? "Controle de Pedidos" : "Relatórios"}
            </button>
          </div>
        )}

        {userProfile && (
          <div className="header-actions">
            <button onClick={handleProfileClick} className="user-profile-button">
              <span className="user-name">{userProfile.nome}</span>
              <span className="user-role">{userProfile.setorNome}</span>
            </button>
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderPage;