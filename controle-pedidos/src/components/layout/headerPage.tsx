import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { auth } from "../../services/firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import "../../styles/HeaderPage.css";
import type { Usuario } from "../../types/Usuario";

interface UserProfile {
  nome: Usuario["displayName"];
  setorNome: Usuario["setorNome"];
}

const setoresAdmin = ["SUPORTE", "GESTAO"];

const HeaderPage: React.FC = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
              setorNome: data.setorNome ?? "Sem setor"
            });
          } else {
            setUserProfile({
              nome: "Usuário",
              setorNome: "Sem setor"
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

  const handleRelatoriosClick = () => {
    navigate("/relatorios");
    setIsDropdownOpen(false);
  };

  const handleMouseEnterDropdown = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
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

  const mostrarRelatorios = userProfile && setoresAdmin.includes(userProfile.setorNome.toUpperCase());

  return (
    <header className="header-page">
      <div className="header-content">
        <div
          className={`app-title-dropdown ${isDropdownOpen ? 'open' : ''}`}
          onMouseEnter={handleMouseEnterDropdown}
          onMouseLeave={handleMouseLeaveDropdown}
        >
          <h2 className="app-title">Controle de Pedidos</h2>
          {mostrarRelatorios && (
            <div className="dropdown-content">
              <button onClick={handleRelatoriosClick} className="dropdown-option">
                Relatórios
              </button>
            </div>
          )}
        </div>

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