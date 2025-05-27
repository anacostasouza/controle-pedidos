import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getFirestore } from "firebase/firestore";
import "../styles/ProfileNamePage.css";
import logoImage from "../assets/logologin.png";
import type { JSX } from "react/jsx-dev-runtime";
import type { Setores } from "../types/Setores";


export default function ProfileNamePage(): JSX.Element {
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState("");
  const [setor, setSetor] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const setores: Setores[] = [
    { value: "producao_loja", label: "Produção/Loja" },
    { value: "gestao", label: "Gestão" },
    { value: "rh", label: "RH" },
    { value: "financeiro", label: "Financeiro" },
    { value: "comercial", label: "Comercial" },
    { value: "producao_galpao", label: "Produção Galpão" },
    { value: "suporte", label: "Suporte" }
  ];

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedUserEmail = localStorage.getItem("userEmail");

    if (!storedUserId) {
      navigate("/");
      return;
    }

    setUserId(storedUserId);
    setUserEmail(storedUserEmail ?? "");
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");

    if (!profileName.trim()) {
      setError("Por favor, insira seu nome.");
      return;
    }

    if (!setor) {
      setError("Por favor, selecione seu setor.");
      return;
    }

    setLoading(true);
    try {
      const db = getFirestore();
      const userRef = doc(db, "usuarios", userId); 
      const setorSelecionado = setores.find((s) => s.value === setor);

      const userData = {
        usuarioID: userId,
        displayName: profileName,
        email: userEmail,
        setor,
        setorNome: setorSelecionado?.label ?? "",
        createdAt: new Date(),
        updatedAt: new Date(),
        statusConta: true
      };

      await setDoc(userRef, userData, { merge: true });

      localStorage.setItem("profileName", profileName);
      localStorage.setItem("userSetor", setor);
      localStorage.setItem("userSetorNome", setorSelecionado?.label ?? "");

      navigate("/dashboard");
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      setError("Erro ao salvar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-card">
          <img src={logoImage} alt="Logo" className="profile-logo" />
          <h1 className="profile-title">Bem-vindo!</h1>
          <p className="profile-subtitle">Complete seu perfil para continuar.</p>

          <form onSubmit={handleSubmit} className="profile-form">
            {error && <p className="profile-error">{error}</p>}

            <div className="input-group">
              <label htmlFor="profileName" className="profile-label">Nome completo</label>
              <input
                id="profileName"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="profile-input"
                placeholder="Digite seu nome"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="input-group">
              <label htmlFor="setor" className="profile-label">Setor</label>
              <select
                id="setor"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="profile-select"
                disabled={loading}
              >
                <option value="">Selecione seu setor</option>
                {setores.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="profile-button" disabled={loading}>
              {loading ? "Salvando..." : "Ir para o Dashboard"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
