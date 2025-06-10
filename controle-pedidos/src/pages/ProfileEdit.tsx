import React, { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, getFirestore, collection, getDocs, query } from "firebase/firestore"; // Adicionado collection, getDocs, query, where
import { getAuth } from "firebase/auth";
import "../styles/ProfileEdit.css"; // reaproveita o mesmo estilo
import logoImage from "../assets/logologin.png";
import { setores } from "../types/Setores";

export interface Usuario {
  usuarioID: string;
  displayName: string;
  email: string;
  setor: string;
  setorNome: string;
  createdAt: Date;
  updatedAt: Date;
  statusConta: boolean;
}

export default function EditProfilePage(): JSX.Element {
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState("");
  const [setor, setSetor] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);

  // NOVO ESTADO: Para armazenar todos os usuários (visível apenas para admins)
  const [allUsers, setAllUsers] = useState<Usuario[]>([]);
  // NOVO ESTADO: Para controlar qual usuário está sendo editado no momento (se for admin editando outro)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState<string>("");
  const [editingUserSetor, setEditingUserSetor] = useState<string>("");
  const [editingUserStatus, setEditingUserStatus] = useState<boolean>(true);


  const setoresAdmin = React.useMemo(() => ["SUPORTE", "GESTAO"], []);
  const usuarioLogadoSetor = usuarioLogado?.setorNome ?? "";

  // Helper para verificar se o usuário logado é admin
  const isCurrentUserAdmin = setoresAdmin.includes(usuarioLogadoSetor);

  const podeSelecionarSetor = (setorValue: string) => {
    const setorParaVerificar = setores.find(s => s.value === setorValue);
    const setorNomeParaVerificar = setorParaVerificar?.label ?? "";

    if (isCurrentUserAdmin) { // Se o usuário logado for admin, ele pode selecionar qualquer setor
      return true;
    }
    // Se o usuário logado NÃO for admin, ele NÃO pode selecionar um setor admin
    if (setoresAdmin.includes(setorNomeParaVerificar)) {
      return false;
    }
    return true; // Se não for admin e o setor não for admin, ele pode selecionar
  };

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      navigate("/");
      return;
    }

    const db = getFirestore();
    const userRef = doc(db, "usuarios", user.uid);

    const fetchUserData = async () => {
      try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setProfileName(data.displayName ?? "");
          setSetor(data.setor ?? "");
          setUserId(user.uid);
          setUserEmail(user.email ?? "");

          const setorAtualLabel = setores.find(s => s.value === (data.setor ?? ""))?.label ?? "";

          const loggedUser: Usuario = {
            usuarioID: user.uid,
            displayName: data.displayName ?? "",
            email: user.email ?? "",
            setor: data.setor ?? "",
            setorNome: setorAtualLabel,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            statusConta: data.statusConta ?? true,
          };
          setUsuarioLogado(loggedUser);

          // Se o usuário logado é admin, buscar todos os usuários
          if (setoresAdmin.includes(loggedUser.setorNome)) {
            const usersCollectionRef = collection(db, "usuarios");
            const q = query(usersCollectionRef); // Pode adicionar .where para filtrar se necessário
            const querySnapshot = await getDocs(q);
            const loadedUsers: Usuario[] = [];
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                loadedUsers.push({
                    usuarioID: doc.id, // O ID do documento é o usuarioID
                    displayName: userData.displayName ?? "",
                    email: userData.email ?? "",
                    setor: userData.setor ?? "",
                    setorNome: userData.setorNome ?? "",
                    createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(),
                    updatedAt: userData.updatedAt?.toDate ? userData.updatedAt.toDate() : new Date(),
                    statusConta: userData.statusConta ?? true,
                });
            });
            setAllUsers(loadedUsers);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar dados do usuário ou todos os usuários:", error);
      }
    };

    fetchUserData();
  }, [navigate, setoresAdmin]); // Adicionado 'navigate' nas dependências para ESLint

  // Função auxiliar para validar edição do próprio usuário
  const validateSelfEdit = (): string | null => {
    if (!profileName.trim()) {
      return "Por favor, insira seu nome.";
    }
    if (!setor) {
      return "Por favor, selecione seu setor.";
    }
    return null;
  };

  // Função auxiliar para validar edição de outro usuário (admin)
  const validateAdminEdit = (): string | null => {
    if (!editingUserName.trim()) {
      return "Por favor, insira o nome do usuário.";
    }
    if (!editingUserSetor) {
      return "Por favor, selecione o setor do usuário.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError("");

    const validationError = !editingUserId ? validateSelfEdit() : validateAdminEdit();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const db = getFirestore();
      const targetUserId = editingUserId ?? userId;
      const userToUpdateRef = doc(db, "usuarios", targetUserId);

      let dataToUpdate: any = {};
      if (!editingUserId) {
        const setorSelecionado = setores.find((s) => s.value === setor);
        dataToUpdate = {
          displayName: profileName,
          setor,
          setorNome: setorSelecionado?.label ?? "",
          updatedAt: new Date(),
        };
      } else {
        const setorSelecionado = setores.find((s) => s.value === editingUserSetor);
        dataToUpdate = {
          displayName: editingUserName,
          setor: editingUserSetor,
          setorNome: setorSelecionado?.label ?? "",
          statusConta: editingUserStatus,
          updatedAt: new Date(),
        };
      }

      await updateDoc(userToUpdateRef, dataToUpdate);

      if (isCurrentUserAdmin && editingUserId) {
        const usersCollectionRef = collection(db, "usuarios");
        const querySnapshot = await getDocs(usersCollectionRef);
        const loadedUsers: Usuario[] = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          loadedUsers.push({
            usuarioID: doc.id,
            displayName: userData.displayName ?? "",
            email: userData.email ?? "",
            setor: userData.setor ?? "",
            setorNome: userData.setorNome ?? "",
            createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(),
            updatedAt: userData.updatedAt?.toDate ? userData.updatedAt.toDate() : new Date(),
            statusConta: userData.statusConta ?? true,
          });
        });
        setAllUsers(loadedUsers);
        setEditingUserId(null);
        setEditingUserName("");
        setEditingUserSetor("");
        setEditingUserStatus(true);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
      setError("Erro ao salvar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditOtherUser = (user: Usuario) => {
    setEditingUserId(user.usuarioID);
    setEditingUserName(user.displayName);
    setEditingUserSetor(user.setor); // O ID do setor
    setEditingUserStatus(user.statusConta);
    setError(""); // Limpa erros anteriores
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingUserName("");
    setEditingUserSetor("");
    setEditingUserStatus(true);
    setError("");
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-card">
          <img src={logoImage} alt="Logo" className="profile-logo" />
          <h1 className="profile-title">
            {editingUserId ? "Editar Usuário" : "Perfil"}
          </h1>
          <p className="profile-subtitle">
            {editingUserId ? "Atualize as informações do usuário." : "Atualize suas informações abaixo."}
          </p>

          <form onSubmit={handleSubmit} className="profile-form">
            {error && <p className="profile-error">{error}</p>}

            {editingUserId ? ( 
                <>
                    <div className="input-group">
                        <label htmlFor="editingUserName" className="profile-label">Nome do Usuário</label>
                        <input
                            id="editingUserName"
                            type="text"
                            value={editingUserName}
                            onChange={(e) => setEditingUserName(e.target.value)}
                            className="profile-input"
                            placeholder="Digite o nome do usuário"
                            disabled={loading}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="editingUserSetor" className="profile-label">Setor do Usuário</label>
                        <select
                            id="editingUserSetor"
                            value={editingUserSetor}
                            onChange={(e) => setEditingUserSetor(e.target.value)}
                            className="profile-select"
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

                    <div className="input-group">
                        <label htmlFor="editingUserStatus" className="profile-label">Status da Conta</label>
                        <select
                            id="editingUserStatus"
                            value={editingUserStatus ? "true" : "false"}
                            onChange={(e) => setEditingUserStatus(e.target.value === "true")}
                            className="profile-select"
                            disabled={loading}
                        >
                            <option value="true">Ativa</option>
                            <option value="false">Inativa</option>
                        </select>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="profile-button" disabled={loading}>
                            {loading ? "Salvando..." : "Salvar Alterações"}
                        </button>
                        <button type="button" onClick={handleCancelEdit} className="profile-button cancel-button" disabled={loading}>
                            Cancelar
                        </button>
                    </div>
                </>
            ) : ( // Formulário para o próprio usuário editar seu perfil
                <>
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
                            {usuarioLogado && setores.map((s) => (
                                podeSelecionarSetor(s.value) && (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                )
                            ))}
                        </select>
                    </div>

                    <button type="submit" className="profile-button" disabled={loading}>
                        {loading ? "Salvando..." : "Salvar Alterações"}
                    </button>
                </>
            )}
          </form>
        </div>

        {/* LISTA DE USUÁRIOS PARA ADMINS */}
        {isCurrentUserAdmin && !editingUserId && ( // Exibir a lista apenas se for admin e não estiver editando um usuário
            <div className="users-list-card">
                <h2>Todos os Usuários</h2>
                {allUsers.length === 0 ? (
                    <p>Nenhum usuário encontrado.</p>
                ) : (
                    <ul className="users-list">
                        {allUsers.map((user) => (
                            <li key={user.usuarioID} className="user-item">
                                <span>{user.displayName} ({user.setorNome}) - {user.email} - {user.statusConta ? "Ativo" : "Inativo"}</span>
                                <button
                                    onClick={() => handleEditOtherUser(user)}
                                    className="edit-user-button"
                                    disabled={loading}
                                >
                                    Editar
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )}
      </div>
    </div>
  );
}