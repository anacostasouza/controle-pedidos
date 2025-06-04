import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { auth } from "../../services/firebase"
import { getFirestore, doc, getDoc } from "firebase/firestore";
import "../../styles/HeaderPage.css";
import type { Usuario } from "../../types/Usuario";




interface UserProfile {
  nome: Usuario["displayName"];
  setorNome: Usuario["setorNome"];
}

const HeaderPage: React.FC = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate("/login");
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
      } catch (error) {
        console.error("Erro ao buscar perfil:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleProfileClick = () => {
    navigate("/ProfileEdit");
  };

  if (loading) {
    return <div className="header-page loading">Carregando...</div>;
  }

  return (
    <header className="header-page">
      <div className="header-content">
        <h2 className="app-title">Controle de Pedidos</h2>
        {userProfile && (
          <button onClick={(handleProfileClick)} className="user-profile-button">
            <span className="user-name">{userProfile.nome}</span>
            <span className="user-role">{userProfile.setorNome}</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default HeaderPage;