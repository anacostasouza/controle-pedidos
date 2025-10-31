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

import ProfileSidebar from "./components/ProfileSideBar";
import { setores, type SetorValue } from "../../types/Setores";
import type { Usuario } from "../../types/Usuario";
import { capitalizeWords } from "../../utils/formatUtils";

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

  const [showManageUsers, setShowManageUsers] = useState<boolean>(false);
  const [showEditStatus, setShowEditStatus] = useState<boolean>(false);

  const [servicosStatus, setServicosStatus] = useState<ServicoStatus[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [selected, setSelected] = useState<
    "profile" | "users" | "editSequenceStatus"
  >("profile");

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
          const currentSetorObj = setores.find((s) => s.value === data.setor);
          const currentSetorLabel = currentSetorObj?.label ?? "";

          const loadedLoggedUser: Usuario = {
            usuarioID: currentUser.uid,
            displayName: data.displayName ?? "",
            email: data.email ?? currentUser.email ?? "",
            setor: (data.setor as SetorValue) ?? "",
            setorNome: currentSetorLabel,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(),
            updatedAt:
              data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate()
                : new Date(),
            statusConta: data.statusConta ?? true,
          };
          setUsuarioLogado(loadedLoggedUser);
          setProfileName(loadedLoggedUser.displayName);
          setSetor(loadedLoggedUser.setor as SetorValue);

          if (setoresAdminLabels.includes(loadedLoggedUser.setorNome)) {
            const usersCollectionRef = collection(db, "usuarios");
            const q = query(usersCollectionRef);
            const querySnapshot = await getDocs(q);
            const loadedUsers: Usuario[] = [];
            querySnapshot.forEach((docSnap) => {
              const userData = docSnap.data();
              const userSetorObj = setores.find(
                (s) => s.value === userData.setor
              );
              const userSetorLabel = userSetorObj?.label ?? "";
              loadedUsers.push({
                usuarioID: docSnap.id,
                displayName: userData.displayName ?? "",
                email: userData.email ?? "",
                setor: (userData.setor as SetorValue) ?? "",
                setorNome: userSetorLabel,
                createdAt:
                  userData.createdAt instanceof Timestamp
                    ? userData.createdAt.toDate()
                    : new Date(),
                updatedAt:
                  userData.updatedAt instanceof Timestamp
                    ? userData.updatedAt.toDate()
                    : new Date(),
                statusConta: userData.statusConta ?? true,
              });
            });
            setAllUsers(loadedUsers);

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
        console.error(err);
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
    setLoading(true);

    try {
      const targetUserId = editingUserId ?? usuarioLogado?.usuarioID ?? "";
      if (!targetUserId) {
        setError("Usuário inválido.");
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "usuarios", targetUserId);

      if (editingUserId) {
        await updateDoc(userDocRef, {
          displayName: editingUserName,
          setor: editingUserSetor,
          setorNome:
            setores.find((s) => s.value === editingUserSetor)?.label ?? "",
          statusConta: editingUserStatus,
          updatedAt: Timestamp.now(),
        });

        setAllUsers((prev) =>
          prev.map((u) =>
            u.usuarioID === editingUserId
              ? {
                  ...u,
                  displayName: editingUserName,
                  setor: editingUserSetor,
                  setorNome:
                    setores.find((s) => s.value === editingUserSetor)?.label ??
                    "",
                  statusConta: editingUserStatus,
                  updatedAt: new Date(),
                }
              : u
          )
        );

        setEditingUserId(null);
      } else {
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
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar dados.");
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
      alert(
        `Sequência de status de ${servico.tipo} - ${servico.subTipo} salva com sucesso!`
      );
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar sequência de status.");
    }
  };

  if (loading) {
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

        <form onSubmit={handleSubmit}>
          {error && <p className="profile-error">{error}</p>}

          {editingUserId ? (
            <>
              <div className="form-group">
                <hr className="borda"></hr>
                <label>Nome</label>
                <input
                  value={editingUserName}
                  onChange={(e) => setEditingUserName(e.target.value)}
                />
                <hr className="borda"></hr>
              </div>
              <div className="form-group">
                <hr className="borda"></hr>
                <label>Setor</label>
                <select
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
                <label>Status da Conta</label>
                <select
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
                <button type="submit">Salvar</button>
                <button type="button" onClick={handleCancelEdit}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Nome</label>
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Setor</label>
                <select
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
                <button type="submit">Salvar</button>
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
            >
              {showManageUsers ? "Fechar Usuários" : "Gerenciar Usuários"}
            </button>
            <button
              onClick={() => {
                setShowEditStatus((prev) => !prev);
                if (!showEditStatus) setShowManageUsers(false);
              }}
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
            <ul className="users-list">
              {allUsers.map((u) => (
                <li className="users-information" key={u.usuarioID}>
                  {u.displayName} - {u.setorNome} - {u.email} -{" "}
                  {u.statusConta ? "Ativo" : "Inativo"}
                  <button
                    className="users-edit-button"
                    disabled={u.usuarioID === usuarioLogado?.usuarioID}
                    onClick={() => handleEditOtherUser(u)}
                  >
                    Editar
                  </button>
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
        <div style={{ display: "flex" }}>
          {isCurrentUserAdmin && (
            <ProfileSidebar selected={selected} setSelected={setSelected} />
          )}
          <div className="settings-page">
            {isCurrentUserAdmin && !editingUserId && (
              <div className="edit-buttons">
                <button
                  onClick={() => {
                    setShowManageUsers((prev) => !prev);
                    if (!showManageUsers) setShowEditStatus(false);
                  }}
                >
                  {showManageUsers ? "Fechar Usuários" : "Gerenciar Usuários"}
                </button>
                <button
                  onClick={() => {
                    setShowEditStatus((prev) => !prev);
                    if (!showEditStatus) setShowManageUsers(false);
                  }}
                >
                  {showEditStatus
                    ? "Fechar Status"
                    : "Editar Sequência de Status"}
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
                <ul className="users-list">
                  {allUsers.map((u) => (
                    <li className="users-information" key={u.usuarioID}>
                      {u.displayName} - {u.setorNome} - {u.email} -{" "}
                      {u.statusConta ? "Ativo" : "Inativo"}
                      <button
                        className="users-edit-button"
                        disabled={u.usuarioID === usuarioLogado?.usuarioID}
                        onClick={() => handleEditOtherUser(u)}
                      >
                        Editar
                      </button>
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
          </div>
        </div>
      </main>
    </div>
  );
}
