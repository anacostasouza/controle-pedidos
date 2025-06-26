/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState, useMemo, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, getDocs, query, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../services/firebase";

import logoColorida from "../assets/LogoColorida.png";
import "../styles/ProfileEdit.css";

import { setores, type SetorValue, type Setor } from "../types/Setores";
import type { Usuario } from "../types/Usuario";

export default function EditProfilePage(): JSX.Element {
  const navigate = useNavigate();

  const [profileName, setProfileName] = useState<string>("");
  const [setor, setSetor] = useState<SetorValue | "">("");
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);

  const [allUsers, setAllUsers] = useState<Usuario[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState<string>("");
  const [editingUserSetor, setEditingUserSetor] = useState<SetorValue | "">("");
  const [editingUserStatus, setEditingUserStatus] = useState<boolean>(true);

  const [showManageUsers, setShowManageUsers] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const setoresAdminLabels = useMemo(() => ["Suporte", "Gestão"], []);

  const isCurrentUserAdmin = useMemo(() =>
    setoresAdminLabels.includes(usuarioLogado?.setorNome ?? ""),
    [usuarioLogado, setoresAdminLabels]
  );

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const fetchInitialData = async () => {
      setLoading(true);
      setError("");

      if (!currentUser) {
        console.warn("Usuário não autenticado. Redirecionando para login.");
        navigate("/");
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "usuarios", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const currentSetorObj = setores.find(s => s.value === data.setor);
          const currentSetorLabel = currentSetorObj?.label ?? "";

          const loadedLoggedUser: Usuario = {
            usuarioID: currentUser.uid,
            displayName: data.displayName ?? "",
            email: (data.email ?? currentUser.email) ?? "",
            setor: (data.setor as SetorValue) ?? "",
            setorNome: currentSetorLabel,
            createdAt: (data.createdAt instanceof Timestamp) ? data.createdAt.toDate() : new Date(),
            updatedAt: (data.updatedAt instanceof Timestamp) ? data.updatedAt.toDate() : new Date(),
            statusConta: data.statusConta ?? true,
          };
          setUsuarioLogado(loadedLoggedUser);
          setProfileName(loadedLoggedUser.displayName);
          setSetor(loadedLoggedUser.setor);

          if (setoresAdminLabels.includes(loadedLoggedUser.setorNome)) {
            const usersCollectionRef = collection(db, "usuarios");
            const q = query(usersCollectionRef);
            const querySnapshot = await getDocs(q);
            const loadedUsers: Usuario[] = [];
            querySnapshot.forEach((docSnap) => {
              const userData = docSnap.data();
              const userSetorObj = setores.find(s => s.value === userData.setor);
              const userSetorLabel = userSetorObj?.label ?? "";
              loadedUsers.push({
                usuarioID: docSnap.id,
                displayName: userData.displayName ?? "",
                email: userData.email ?? "",
                setor: (userData.setor as SetorValue) ?? "",
                setorNome: userSetorLabel,
                createdAt: (userData.createdAt instanceof Timestamp) ? userData.createdAt.toDate() : new Date(),
                updatedAt: (userData.updatedAt instanceof Timestamp) ? userData.updatedAt.toDate() : new Date(),
                statusConta: userData.statusConta ?? true,
              });
            });
            setAllUsers(loadedUsers);
          }

        } else {
          setError("Seu perfil não foi encontrado. Contate o suporte.");
          navigate("/");
        }
      } catch (err) {
        console.error("ERRO ao carregar dados iniciais:", err);
        setError("Erro ao carregar dados. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [navigate, setoresAdminLabels]);

  const validateSelfEdit = (): string | null => {
    if (!profileName.trim()) {
      return "O nome de exibição não pode ser vazio.";
    }
    if (!setor) {
      return "Por favor, selecione seu setor.";
    }

    const selectedSetorObj = setores.find(s => s.value === setor);
    const selectedSetorLabel = selectedSetorObj?.label;

    if (!selectedSetorLabel) {
        return "Setor selecionado inválido.";
    }

    if (!isCurrentUserAdmin && setoresAdminLabels.includes(selectedSetorLabel)) {
      return `Você não tem permissão para mudar seu setor para ${selectedSetorLabel}.`;
    }
    return null;
  };

  const validateAdminEdit = (): string | null => {
    if (!editingUserName.trim()) {
      return "O nome do usuário não pode ser vazio.";
    }
    if (!editingUserSetor) {
      return "Por favor, selecione o setor do usuário.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const validationError = editingUserId ? validateAdminEdit() : validateSelfEdit();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const targetUserId = editingUserId ?? (usuarioLogado?.usuarioID ?? "");
      if (!targetUserId) {
        setError("ID do usuário não encontrado para atualização.");
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "usuarios", targetUserId);
      let dataToUpdate: any = {};
      let updatedSetorLabel: string;
      let updatedSetorValue: SetorValue | "";

      if (editingUserId) {
        updatedSetorValue = editingUserSetor;
        updatedSetorLabel = setores.find(s => s.value === editingUserSetor)?.label ?? "";
        dataToUpdate = {
          displayName: editingUserName,
          setor: updatedSetorValue,
          setorNome: updatedSetorLabel,
          statusConta: editingUserStatus,
          updatedAt: Timestamp.now(),
        };
        await updateDoc(userDocRef, dataToUpdate);

        const usersCollectionRef = collection(db, "usuarios");
        const querySnapshot = await getDocs(query(usersCollectionRef));
        const reloadedUsers: Usuario[] = [];
        querySnapshot.forEach((docSnap) => {
          const userData = docSnap.data();
          const userSetorObj = setores.find(s => s.value === userData.setor);
          const userSetorLabel = userSetorObj?.label ?? "";
          reloadedUsers.push({
            usuarioID: docSnap.id,
            displayName: userData.displayName ?? "",
            email: userData.email ?? "",
            setor: (userData.setor as SetorValue) ?? "",
            setorNome: userSetorLabel,
            createdAt: (userData.createdAt instanceof Timestamp) ? userData.createdAt.toDate() : new Date(),
            updatedAt: (userData.updatedAt instanceof Timestamp) ? userData.updatedAt.toDate() : new Date(),
            statusConta: userData.statusConta ?? true,
          });
        });
        setAllUsers(reloadedUsers);
        setEditingUserId(null); 
        setEditingUserName("");
        setEditingUserSetor("");
        setEditingUserStatus(true);
        setError(""); 

      } else { 
        updatedSetorValue = setor;
        updatedSetorLabel = setores.find(s => s.value === setor)?.label ?? "";
        dataToUpdate = {
          displayName: profileName,
          setor: updatedSetorValue,
          setorNome: updatedSetorLabel,
          updatedAt: Timestamp.now(),
        };
        await updateDoc(userDocRef, dataToUpdate);

        setUsuarioLogado(prev => prev ? {
          ...prev,
          displayName: profileName,
          setor: updatedSetorValue,
          setorNome: updatedSetorLabel,
          updatedAt: (dataToUpdate.updatedAt instanceof Timestamp) ? dataToUpdate.updatedAt.toDate() : new Date()
        } : null);

        navigate("/dashboard");
      }

    } catch (err) {
      console.error("ERRO ao salvar o perfil:", err);
      setError("Erro ao salvar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditOtherUser = (user: Usuario) => {
    if (!isCurrentUserAdmin || !showManageUsers) {
        return;
    }
    setEditingUserId(user.usuarioID);
    setEditingUserName(user.displayName);
    setEditingUserSetor(user.setor as SetorValue);
    setEditingUserStatus(user.statusConta);
    setError("");
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingUserName("");
    setEditingUserSetor("");
    setEditingUserStatus(true);
    setError("");
  };

  const handleToggleManageUsers = () => {
    if (editingUserId) {
        handleCancelEdit();
    }
    setShowManageUsers(prev => !prev);
  };

  if (loading) {
    return (
      <div className="profile-page loading">
        <p>Carregando perfil e dados...</p>
      </div>
    );
  }

  if (!usuarioLogado) {
    return (
      <div className="profile-page error-state">
        <p className="profile-error">Não foi possível carregar o perfil do usuário. Por favor, tente novamente mais tarde ou contate o suporte.</p>
        <button onClick={() => navigate("/")} className="profile-button">Voltar para o Login</button>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <main className="profile-content">
          <header className="content-header">
              <h1 className="content-title">
                  {editingUserId ? "Editar Usuário" : "Editar Perfil"}
              </h1>
          </header>

          <form onSubmit={handleSubmit} className="profile-form-grid" id="profile-form-id">
            {error && <p className="profile-error full-width">{error}</p>}

            {!showManageUsers || !isCurrentUserAdmin || (isCurrentUserAdmin && !editingUserId) ? (
                <>
                    <div className="form-group full-width">
                        <label htmlFor="profileName">Nome completo</label>
                        <input
                            id="profileName"
                            type="text"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="Digite seu nome"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group full-width">
                        <label htmlFor="setor">Setor</label>
                        <select
                            id="setor"
                            value={setor}
                            onChange={(e) => setSetor(e.target.value as SetorValue)}
                            disabled={loading}
                        >
                            <option value="">Selecione seu setor</option>
                            {setores.map((s) => {
                               
                                if (isCurrentUserAdmin || !setoresAdminLabels.includes(s.label)) {
                                    return (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    );
                                }
                                return null; 
                            })}
                        </select>
                    </div>
                </>
            ) : (
              
                isCurrentUserAdmin && editingUserId && (
                    <>
                        <div className="form-group">
                            <label htmlFor="editingUserName">Nome do Usuário</label>
                            <input
                                id="editingUserName"
                                type="text"
                                value={editingUserName}
                                onChange={(e) => setEditingUserName(e.target.value)}
                                placeholder="Digite o nome do usuário"
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="editingUserSetor">Setor do Usuário</label>
                            <select
                                id="editingUserSetor"
                                value={editingUserSetor}
                                onChange={(e) => setEditingUserSetor(e.target.value as SetorValue)}
                                disabled={loading}
                            >
                                <option value="">Selecione o setor</option>
                                {setores.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group full-width">
                            <label htmlFor="editingUserStatus">Status da Conta</label>
                            <select
                                id="editingUserStatus"
                                value={editingUserStatus ? "true" : "false"}
                                onChange={(e) => setEditingUserStatus(e.target.value === "true")}
                                disabled={loading}
                            >
                                <option value="true">Ativa</option>
                                <option value="false">Inativa</option>
                            </select>
                        </div>

                        <div className="form-actions full-width">
                            <button type="button" onClick={handleCancelEdit} className="btn cancel-btn" disabled={loading}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn save-btn" disabled={loading} form="profile-form-id">
                                {loading ? "Salvando..." : "Salvar Alterações"}
                            </button>
                        </div>
                    </>
                )
            )}
            {!editingUserId && (
                <div className="profile-buttons-container">
                    {isCurrentUserAdmin && (
                        <button
                            type="button" 
                            onClick={handleToggleManageUsers}
                            className="manage-users-btn"
                            disabled={loading}
                        >
                            {showManageUsers ? "Voltar" : "Gerenciar Outros Usuários"}
                        </button>
                    )}
                    {(!showManageUsers || !isCurrentUserAdmin) && (
                        <div className="form-action">
                            <button type="submit" className="btn save-btn" disabled={loading} form="profile-form-id">
                                {loading ? "Salvando..." : "Salvar Alterações"}
                            </button>
                        </div>
                    )}
                </div>
            )}
          </form>

          
          {isCurrentUserAdmin && showManageUsers && !editingUserId && (
              <div className="users-list-card">
                  <h2>Todos os Usuários</h2>
                  {allUsers.length === 0 ? (
                      <p>Nenhum usuário encontrado.</p>
                  ) : (
                      <ul className="users-list">
                          {allUsers.map((user) => (
                              <li key={user.usuarioID} className="user-item">
                                  <span>
                                      {user.displayName} ({user.setorNome}) - {user.email} - {user.statusConta ? "Ativo" : "Inativo"}
                                  </span>
                                  <button
                                      onClick={() => handleEditOtherUser(user)}
                                      className="edit-user-button"
                                      disabled={loading || user.usuarioID === usuarioLogado?.usuarioID}
                                  >
                                      Editar
                                  </button>
                              </li>
                          ))}
                      </ul>
                  )}
              </div>
          )}
          <div id="logo-colorida">
            <img src={logoColorida} alt="logoColorida" className="logo-colorida" />
          </div>
      </main>
    </div>
  );
}