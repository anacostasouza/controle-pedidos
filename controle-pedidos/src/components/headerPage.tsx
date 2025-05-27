import React, { useEffect, useState } from "react";
import { useNavigate, Navigate } from 'react-router-dom';
import { auth } from "../services/firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import "../styles/HeaderPage.css";

interface UserProfile {
  nome: string;
  setorNome: string;
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
            nome: data.nome ?? "Usuário",
            setorNome: data.setorNome ?? "Admin"
          });
        } else {
          setUserProfile({
            nome: "Usuário",
            setorNome: "Admin"
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