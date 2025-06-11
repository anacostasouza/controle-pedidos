import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { auth } from "../../services/firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";
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
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderPage;
