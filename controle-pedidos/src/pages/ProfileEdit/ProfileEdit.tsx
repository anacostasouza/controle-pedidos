import React, { useEffect, useState, useMemo, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  Timestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../services/firebase";

import logoColorida from "../../assets/LogoColorida.png";
import "../../styles/ProfileEdit.css";

import { setores, type SetorValue } from "../../types/Setores";
import type { Usuario } from "../../types/Usuario";
import { capitalizeWords } from "../../utils/FormatUtils";
import {
  listarUsuarios,
  criarUsuario,
  atualizarUsuario,
  desativarUsuario,
  ativarUsuario,
  deletarUsuario,
  type UsuarioResponse,
} from "../../services/UsuariosServices";
import {
  extractErrorMessage,
  mapUsuarioFromApi,
  mapUsuarioFromFirestore,
} from "../../utils/UserDataUtils";

interface ServicoStatus {
  id: string;
  tipo: string;
  subTipo: string;
  sequenciaStatus: string[];
}

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

  // Novos estados para criar usuário
  const [showCreateUserForm, setShowCreateUserForm] = useState<boolean>(false);
  const [newUserEmail, setNewUserEmail] = useState<string>("");
  const [newUserName, setNewUserName] = useState<string>("");
  const [newUserSetor, setNewUserSetor] = useState<SetorValue | "">("");

  const [showManageUsers, setShowManageUsers] = useState<boolean>(false);
  const [showEditStatus, setShowEditStatus] = useState<boolean>(false);

  const [servicosStatus, setServicosStatus] = useState<ServicoStatus[]>([]);

  // Estados para modais de confirmação
  const [showDeactivateModal, setShowDeactivateModal] = useState<boolean>(false);
  const [showActivateModal, setShowActivateModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteConfirmationStep, setDeleteConfirmationStep] = useState<number>(0);
  const [pendingAction, setPendingAction] = useState<{
    userId: string;
    userName: string;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const setoresAdminLabels = useMemo(() => ["Suporte", "Gestão"], []);
  const isCurrentUserAdmin = useMemo(
    () => setoresAdminLabels.includes(usuarioLogado?.setorNome ?? ""),
    [usuarioLogado, setoresAdminLabels]
  );

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const fetchInitialData = async () => {
      setLoading(true);
      setError("");

      if (!currentUser) {
        navigate("/");
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "usuarios", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();

          const loadedLoggedUser: Usuario = mapUsuarioFromFirestore(
            currentUser.uid,
            data,
            setores,
            currentUser.email ?? ""
          );
          setUsuarioLogado(loadedLoggedUser);
          setProfileName(loadedLoggedUser.displayName);
          setSetor(loadedLoggedUser.setor as SetorValue);

          if (setoresAdminLabels.includes(loadedLoggedUser.setorNome)) {
            // Usar API REST para listar usuários
            try {
              const users = await listarUsuarios();
              const loadedUsers: Usuario[] = users.map((u: UsuarioResponse) =>
                mapUsuarioFromApi(u, setores)
              );
              setAllUsers(loadedUsers);
            } catch (err: Error | unknown) {
              if (import.meta.env.DEV) {
                console.error("Erro ao listar usuários:", err);
              }
              // Fallback para Firestore se API falhar
              const usersCollectionRef = collection(db, "usuarios");
              const q = query(usersCollectionRef);
              const querySnapshot = await getDocs(q);
              const loadedUsers: Usuario[] = [];
              querySnapshot.forEach((docSnap) => {
                const userData = docSnap.data();
                loadedUsers.push(
                  mapUsuarioFromFirestore(docSnap.id, userData, setores)
                );
              });
              setAllUsers(loadedUsers);
            }

            const servicosRef = collection(db, "servicosStatus");
            const servicosSnap = await getDocs(servicosRef);
            const loadedServicos: ServicoStatus[] = [];
            servicosSnap.forEach((docSnap) => {
              const data = docSnap.data();
              loadedServicos.push({
                id: docSnap.id,
                tipo: data.tipo,
                subTipo: data.subTipo,
                sequenciaStatus: data.sequenciaStatus ?? [],
              });
            });
            setServicosStatus(loadedServicos);
          }
        } else {
          setError("Perfil não encontrado.");
          navigate("/");
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error(err);
        }
        setError("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [navigate, setoresAdminLabels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const targetUserId = editingUserId ?? usuarioLogado?.usuarioID ?? "";
      if (!targetUserId) {
        setError("Usuário inválido.");
        setLoading(false);
        return;
      }

      if (editingUserId) {
        // Usar API REST para atualizar usuário
        try {
          await atualizarUsuario(editingUserId, {
            displayName: editingUserName,
            setor: editingUserSetor as SetorValue,
            statusConta: editingUserStatus,
          });

          setAllUsers((prev) =>
            prev.map((u) =>
              u.usuarioID === editingUserId
                ? {
                    ...u,
                    displayName: editingUserName,
                    setor: editingUserSetor as SetorValue,
                    setorNome:
                      setores.find((s) => s.value === editingUserSetor)?.label ??
                      "",
                    statusConta: editingUserStatus,
                    updatedAt: new Date(),
                  }
                : u
            )
          );

          setSuccessMessage("Usuário atualizado com sucesso!");
          setEditingUserId(null);
        } catch (err: Error | unknown) {
          setError((err instanceof Error ? err.message : String(err)) || "Erro ao atualizar usuário.");
        }
      } else {
        const userDocRef = doc(db, "usuarios", targetUserId);
        await updateDoc(userDocRef, {
          displayName: profileName,
          setor,
          setorNome: setores.find((s) => s.value === setor)?.label ?? "",
          updatedAt: Timestamp.now(),
        });

        setUsuarioLogado((prev) =>
          prev
            ? {
                ...prev,
                displayName: profileName,
                setor,
                setorNome: setores.find((s) => s.value === setor)?.label ?? "",
                updatedAt: new Date(),
              }
            : null
        );
        setSuccessMessage("Perfil atualizado com sucesso!");
        navigate("/dashboard");
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error(err);
      }
      setError("Erro ao salvar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      if (!newUserEmail || !newUserName || !newUserSetor) {
        setError("Email, nome e setor são obrigatórios.");
        setLoading(false);
        return;
      }

      // Usar API REST para criar usuário
      const newUser = await criarUsuario({
        email: newUserEmail,
        displayName: newUserName,
        setor: newUserSetor as SetorValue,
      });

      const userSetorObj = setores.find((s) => s.value === newUser.setor);
      const userSetorLabel = userSetorObj?.label ?? newUser.setorNome ?? "";

      setAllUsers((prev) => [
        ...prev,
        {
          usuarioID: newUser.usuarioID,
          displayName: newUser.displayName,
          email: newUser.email,
          setor: newUser.setor as SetorValue,
          setorNome: userSetorLabel,
          createdAt: new Date(),
          updatedAt: new Date(),
          statusConta: true,
        },
      ]);

      setSuccessMessage(`Usuário ${newUserName} criado com sucesso!`);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserSetor("");
    } catch (err: Error | unknown) {
      console.error(err);
      setError(extractErrorMessage(err, "Erro ao criar usuário."));
    } finally {
      setLoading(false);
    }
  };

  const handleEditOtherUser = (user: Usuario) => {
    if (!isCurrentUserAdmin || !showManageUsers) return;
    setEditingUserId(user.usuarioID);
    setEditingUserName(user.displayName);
    setEditingUserSetor(user.setor as SetorValue | "");
    setEditingUserStatus(user.statusConta);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingUserName("");
    setEditingUserSetor("");
    setEditingUserStatus(true);
  };

  const handleDesativarUsuario = (userId: string, userName: string) => {
    setPendingAction({ userId, userName });
    setShowDeactivateModal(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!pendingAction) return;

    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      await desativarUsuario(pendingAction.userId);

      setAllUsers((prev) =>
        prev.map((u) =>
          u.usuarioID === pendingAction.userId
            ? {
                ...u,
                statusConta: false,
                updatedAt: new Date(),
              }
            : u
        )
      );

      setSuccessMessage(`Usuário ${pendingAction.userName} desativado com sucesso!`);
    } catch (err: Error | unknown) {
      if (import.meta.env.DEV) {
        console.error(err);
      }
      setError(extractErrorMessage(err, "Erro ao desativar usuário."));
    } finally {
      setLoading(false);
      setShowDeactivateModal(false);
      setPendingAction(null);
    }
  };

  const handleCancelDeactivate = () => {
    setShowDeactivateModal(false);
    setPendingAction(null);
  };

  const handleAtivarUsuario = (userId: string, userName: string) => {
    setPendingAction({ userId, userName });
    setShowActivateModal(true);
  };

  const handleConfirmActivate = async () => {
    if (!pendingAction) return;

    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      await ativarUsuario(pendingAction.userId);

      setAllUsers((prev) =>
        prev.map((u) =>
          u.usuarioID === pendingAction.userId
            ? {
                ...u,
                statusConta: true,
                updatedAt: new Date(),
              }
            : u
        )
      );

      setSuccessMessage(`Usuário ${pendingAction.userName} ativado com sucesso!`);
    } catch (err: Error | unknown) {
      if (import.meta.env.DEV) {
        console.error(err);
      }
      setError(extractErrorMessage(err, "Erro ao ativar usuário."));
    } finally {
      setLoading(false);
      setShowActivateModal(false);
      setPendingAction(null);
    }
  };

  const handleCancelActivate = () => {
    setShowActivateModal(false);
    setPendingAction(null);
  };

  const handleDeletarUsuario = (userId: string, userName: string) => {
    setPendingAction({ userId, userName });
    setDeleteConfirmationStep(1);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteStep1 = () => {
    setDeleteConfirmationStep(2);
  };

  const handleConfirmDeleteStep2 = async () => {
    if (!pendingAction) return;

    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      await deletarUsuario(pendingAction.userId);

      setAllUsers((prev) => prev.filter((u) => u.usuarioID !== pendingAction.userId));

      setSuccessMessage(`Usuário ${pendingAction.userName} deletado com sucesso!`);
    } catch (err: Error | unknown) {
      if (import.meta.env.DEV) {
        console.error(err);
      }
      setError(extractErrorMessage(err, "Erro ao deletar usuário."));
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeleteConfirmationStep(0);
      setPendingAction(null);
    }
  };

  const handleBackDeleteStep = () => {
    setDeleteConfirmationStep(1);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfirmationStep(0);
    setPendingAction(null);
  };

  const handleSequenciaChange = (id: string, index: number, value: string) => {
    setServicosStatus((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              sequenciaStatus: s.sequenciaStatus.map((st, i) =>
                i === index ? value : st
              ),
            }
          : s
      )
    );
  };

  const handleAddStatus = (id: string) => {
    setServicosStatus((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, sequenciaStatus: [...s.sequenciaStatus, ""] } : s
      )
    );
  };

  const handleRemoveStatus = (id: string, index: number) => {
    setServicosStatus((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              sequenciaStatus: s.sequenciaStatus.filter((_, i) => i !== index),
            }
          : s
      )
    );
  };

  const handleSalvarSequencia = async (id: string) => {
    try {
      const servico = servicosStatus.find((s) => s.id === id);
      if (!servico) return;
      await updateDoc(doc(db, "servicosStatus", id), {
        sequenciaStatus: servico.sequenciaStatus,
      });
      setSuccessMessage(
        `Sequência de status de ${servico.tipo} - ${servico.subTipo} salva com sucesso!`
      );
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar sequência de status.");
    }
  };

  if (loading && !showCreateUserForm) {
    return (
      <div className="profile-page loading">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <main className="profile-content">
        <h1 className="title-header">
          {editingUserId ? "Editar Usuário" : "Editar Perfil"}
        </h1>

        {error && <p className="profile-error">{error}</p>}
        {successMessage && (
          <p className="profile-success">{successMessage}</p>
        )}

        <form onSubmit={handleSubmit}>
          {editingUserId ? (
            <>
              <div className="form-group">
                <hr className="borda"></hr>
                <label htmlFor="editingUserName">Nome</label>
                <input
                  id="editingUserName"
                  value={editingUserName}
                  onChange={(e) => setEditingUserName(e.target.value)}
                />
                <hr className="borda"></hr>
              </div>
              <div className="form-group">
                <hr className="borda"></hr>
                <label htmlFor="editingUserSetor">Setor</label>
                <select
                  id="editingUserSetor"
                  value={editingUserSetor}
                  onChange={(e) =>
                    setEditingUserSetor(e.target.value as SetorValue)
                  }
                >
                  <option value="">Selecione</option>
                  {setores.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <hr className="borda"></hr>
              </div>
              <div className="form-group">
                <label htmlFor="editingUserStatus">Status da Conta</label>
                <select
                  id="editingUserStatus"
                  value={editingUserStatus ? "true" : "false"}
                  onChange={(e) =>
                    setEditingUserStatus(e.target.value === "true")
                  }
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
              <div className="action-button">
                <button type="submit" disabled={loading}>
                  Salvar
                </button>
                <button type="button" onClick={handleCancelEdit} disabled={loading}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="profileName">Nome</label>
                <input
                  id="profileName"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="profileSetor">Setor</label>
                <select
                  id="profileSetor"
                  value={setor}
                  onChange={(e) => setSetor(e.target.value as SetorValue)}
                >
                  <option value="">Selecione</option>
                  {setores.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="header-save">
                <button type="submit" disabled={loading}>
                  Salvar
                </button>
              </div>
            </>
          )}
        </form>

        {isCurrentUserAdmin && !editingUserId && (
          <div className="edit-buttons">
            <button
              onClick={() => {
                setShowManageUsers((prev) => !prev);
                if (!showManageUsers) setShowEditStatus(false);
              }}
              disabled={loading}
            >
              {showManageUsers ? "Fechar Usuários" : "Gerenciar Usuários"}
            </button>
            <button
              onClick={() => {
                setShowEditStatus((prev) => !prev);
                if (!showEditStatus) setShowManageUsers(false);
              }}
              disabled={loading}
            >
              {showEditStatus ? "Fechar Status" : "Editar Sequência de Status"}
            </button>
          </div>
        )}

        {isCurrentUserAdmin && showManageUsers && (
          <div className="users-form-edit">
            <div className="header-users">
              <hr className="borda-users"></hr>
              <h2 className="title-users">Usuários</h2>
              <hr className="borda-users"></hr>
            </div>

            {!showCreateUserForm ? (
              <button
                className="btn-create-user"
                onClick={() => setShowCreateUserForm(true)}
                disabled={loading}
              >
                + Criar Novo Usuário
              </button>
            ) : (
              <form className="create-user-form" onSubmit={handleCreateUser}>
                <h3>Criar Novo Usuário</h3>
                <div className="form-group">
                  <label htmlFor="newUserEmail">Email</label>
                  <input
                    id="newUserEmail"
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="newUserName">Nome</label>
                  <input
                    id="newUserName"
                    type="text"
                    placeholder="Nome Completo"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="newUserSetor">Setor</label>
                  <select
                    id="newUserSetor"
                    value={newUserSetor}
                    onChange={(e) =>
                      setNewUserSetor(e.target.value as SetorValue)
                    }
                    required
                  >
                    <option value="">Selecione</option>
                    {setores.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="action-button">
                  <button type="submit" disabled={loading}>
                    Criar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserForm(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <ul className="users-list">
              {allUsers.map((u) => (
                <li className="users-information" key={u.usuarioID}>
                  <div className="user-info">
                    <span>
                      {u.displayName} - {u.setorNome} - {u.email} -{" "}
                      <strong
                        style={{
                          color: u.statusConta ? "green" : "red",
                        }}
                      >
                        {u.statusConta ? "Ativo" : "Inativo"}
                      </strong>
                    </span>
                  </div>
                  <div className="user-actions">
                    <button
                      className="users-edit-button"
                      disabled={
                        u.usuarioID === usuarioLogado?.usuarioID || loading
                      }
                      onClick={() => handleEditOtherUser(u)}
                    >
                      Editar
                    </button>
                    <button
                      className="users-deactivate-button"
                      disabled={
                        u.usuarioID === usuarioLogado?.usuarioID || loading
                      }
                      onClick={() =>
                        u.statusConta
                          ? handleDesativarUsuario(u.usuarioID, u.displayName)
                          : handleAtivarUsuario(u.usuarioID, u.displayName)
                      }
                    >
                      {u.statusConta ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      className="users-delete-button"
                      disabled={
                        u.usuarioID === usuarioLogado?.usuarioID || loading
                      }
                      onClick={() =>
                        handleDeletarUsuario(u.usuarioID, u.displayName)
                      }
                    >
                      Deletar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isCurrentUserAdmin && showEditStatus && (
          <div className="status-edit">
            <hr className="borda"></hr>
            <h2 className="status-title">Sequência de Status</h2>
            <hr className="borda"></hr>
            {servicosStatus.map((s) => (
              <div key={s.id}>
                <h3 className="status-subtitle">
                  {capitalizeWords(s.tipo)}
                  {s.subTipo ? ` - ${capitalizeWords(s.subTipo)}` : ""}
                </h3>
                {s.sequenciaStatus.map((st, idx) => (
                  <div className="status-sequence" key={idx}>
                    <input
                      value={st}
                      onChange={(e) =>
                        handleSequenciaChange(s.id, idx, e.target.value)
                      }
                    />
                    <button
                      className="status-button"
                      onClick={() => handleRemoveStatus(s.id, idx)}
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <div className="status-button-actions">
                  <button onClick={() => handleAddStatus(s.id)}>
                    Adicionar
                  </button>
                  <button onClick={() => handleSalvarSequencia(s.id)}>
                    Salvar
                  </button>
                </div>
                <hr className="borda"></hr>
              </div>
            ))}
          </div>
        )}

        <div id="logo-colorida">
          <img src={logoColorida} alt="Logo" />
        </div>
      </main>

      {/* Modal Desativar Usuário */}
      {showDeactivateModal && pendingAction && (
        <div className="modal-overlay" onClick={handleCancelDeactivate}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "#8f2f2f", width: "80px", height: "80px" }}
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2>Desativar Usuário</h2>
            <p>
              Tem certeza que deseja desativar <strong>{pendingAction.userName}</strong>?
            </p>
            <p className="modal-warning">
              Ele não poderá mais acessar o sistema até ser reativado.
            </p>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={handleCancelDeactivate}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="btn-delete"
                onClick={handleConfirmDeactivate}
                disabled={loading}
              >
                {loading ? "Desativando..." : "Desativar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ativar Usuário */}
      {showActivateModal && pendingAction && (
        <div className="modal-overlay" onClick={handleCancelActivate}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "#2d5016", width: "80px", height: "80px" }}
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2>Ativar Usuário</h2>
            <p>
              Tem certeza que deseja ativar <strong>{pendingAction.userName}</strong>?
            </p>
            <p className="modal-warning">
              Ele poderá acessar o sistema novamente.
            </p>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={handleCancelActivate}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="btn-activate"
                onClick={handleConfirmActivate}
                disabled={loading}
              >
                {loading ? "Ativando..." : "Ativar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Deletar Usuário */}
      {showDeleteModal && pendingAction && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                width="80px"
                height="80px"
                viewBox="0 0 28 28"
                version="1.1"
              >
                <g
                  id="trashIcon1"
                  stroke="none"
                  strokeWidth="1"
                  fill="none"
                  fillRule="evenodd"
                >
                  <g
                    id="trashIcon2"
                    fill="#5f1919"
                    fillRule="nonzero"
                  >
                    <path
                      d="M19.5,16 C22.5375661,16 25,18.4624339 25,21.5 C25,24.5375661 22.5375661,27 19.5,27 C16.4624339,27 14,24.5375661 14,21.5 C14,18.4624339 16.4624339,16 19.5,16 Z M14,2 C16.1421954,2 17.8910789,3.68396847 17.9951047,5.80035966 L18,6 L23,6 C23.5522847,6 24,6.44771525 24,7 C24,7.51283584 23.6139598,7.93550716 23.1166211,7.99327227 L23,8 L22.151,8 L21.5567191,15.3321126 C20.910333,15.1166725 20.2187917,15 19.5,15 C15.9101491,15 13,17.9101491 13,21.5 C13,23.2469007 13.6891263,24.8328473 14.8103588,26.0008195 L10.7666018,26 C8.81304683,26 7.18674613,24.5002245 7.02886788,22.5530595 L5.848,8 L5,8 C4.48716416,8 4.06449284,7.61395981 4.00672773,7.11662113 L4,7 C4,6.48716416 4.38604019,6.06449284 4.88337887,6.00672773 L5,6 L10,6 C10,3.790861 11.790861,2 14,2 Z M17.7309061,19.0241379 L17.6616582,18.9662824 C17.4911486,18.8481609 17.2635568,18.8481609 17.0930472,18.9662824 L17.0237993,19.0241379 L16.9659438,19.0933858 C16.8478223,19.2638954 16.8478223,19.4914871 16.9659438,19.6619968 L17.0237993,19.7312446 L18.7933527,21.5006913 L17.0263884,23.2674911 L16.968533,23.3367389 C16.8504114,23.5072486 16.8504114,23.7348403 16.968533,23.9053499 L17.0263884,23.9745978 L17.0956363,24.0324533 C17.2661459,24.1505748 17.4937377,24.1505748 17.6642473,24.0324533 L17.7334952,23.9745978 L19.5003527,22.2076913 L21.2693951,23.9768405 L21.338643,24.0346959 C21.5091526,24.1528175 21.7367444,24.1528175 21.907254,24.0346959 L21.9765019,23.9768405 L22.0343574,23.9075926 C22.1524789,23.737083 22.1524789,23.5094912 22.0343574,23.3389816 L21.9765019,23.2697337 L20.2073527,21.5006913 L21.9792686,19.7312918 L22.0371241,19.6620439 C22.1552456,19.4915343 22.1552456,19.2639425 22.0371241,19.0934329 L21.9792686,19.024185 L21.9100208,18.9663296 C21.7395111,18.848208 21.5119194,18.848208 21.3414098,18.9663296 L21.2721619,19.024185 L19.5003527,20.7936913 L17.7309061,19.0241379 L17.6616582,18.9662824 L17.7309061,19.0241379 Z M14,4 C12.9456382,4 12.0818349,4.81587779 12.0054857,5.85073766 L12,6 L16,6 L15.9945143,5.85073766 C15.9181651,4.81587779 15.0543618,4 14,4 Z"
                      id="trashIcon3"
                    ></path>
                  </g>
                </g>
              </svg>
            </div>
            <h2>
              {deleteConfirmationStep === 1 ? "Confirmar Exclusão" : "Confirmar Novamente"}
            </h2>
            {deleteConfirmationStep === 1 ? (
              <>
                <p>
                  Tem certeza que deseja DELETAR <strong>{pendingAction.userName}</strong> permanentemente?
                </p>
                <p className="modal-warning">Esta ação não pode ser desfeita!</p>
                <div className="modal-actions">
                  <button
                    className="btn-cancel"
                    onClick={handleCancelDelete}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    className="btn-delete"
                    onClick={handleConfirmDeleteStep1}
                    disabled={loading}
                  >
                    Continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>
                  Tem certeza de que deseja deletar permanentemente <strong>{pendingAction.userName}</strong>? Essa ação não pode ser desfeita.
                </p>
                <p className="modal-warning">Confirme novamente para deletar este usuário.</p>
                <div className="modal-actions">
                  <button
                    className="btn-cancel"
                    onClick={handleBackDeleteStep}
                    disabled={loading}
                  >
                    Voltar
                  </button>
                  <button
                    className="btn-delete"
                    onClick={handleConfirmDeleteStep2}
                    disabled={loading}
                  >
                    {loading ? "Deletando..." : "Deletar Usuário"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
