import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Usuario } from "../../../types/Usuario";
import { setores, type SetorValue } from "../../../types/Setores";
import UserEditForm from "./UserEditForm";

interface UserListProps {
  allUsers: Usuario[];
  usuarioLogado: Usuario | null;
  handleEditOtherUser: (user: Usuario) => void;
  handleDeleteUser: (uid: string) => void;
  handleDeactivateUser: (uid: string) => void;
  handleActivateUser: (uid: string) => void;
  editingUserId: string | null;
  editingUserName: string;
  setEditingUserName: Dispatch<SetStateAction<string>>;
  editingUserSetor: SetorValue | "";
  setEditingUserSetor: Dispatch<SetStateAction<SetorValue | "">>;
  editingUserStatus: boolean;
  setEditingUserStatus: Dispatch<SetStateAction<boolean>>;
  handleSubmit: (e: FormEvent) => void;
  handleCancelEdit: () => void;
  showCreateUserForm: boolean;
  setShowCreateUserForm: Dispatch<SetStateAction<boolean>>;
  newUserEmail: string;
  setNewUserEmail: Dispatch<SetStateAction<string>>;
  newUserName: string;
  setNewUserName: Dispatch<SetStateAction<string>>;
  newUserSetor: SetorValue | "";
  setNewUserSetor: Dispatch<SetStateAction<SetorValue | "">>;
  handleCreateUser: (e: FormEvent) => void;
  loading: boolean;
  error: string;
}

export default function UserList({
  allUsers,
  usuarioLogado,
  handleEditOtherUser,
  handleDeleteUser,
  handleDeactivateUser,
  handleActivateUser,
  editingUserId,
  editingUserName,
  setEditingUserName,
  editingUserSetor,
  setEditingUserSetor,
  editingUserStatus,
  setEditingUserStatus,
  handleSubmit,
  handleCancelEdit,
  showCreateUserForm,
  setShowCreateUserForm,
  newUserEmail,
  setNewUserEmail,
  newUserName,
  setNewUserName,
  newUserSetor,
  setNewUserSetor,
  handleCreateUser,
  loading,
  error,
}: UserListProps) {
  return (
    <div className="users-form-edit">
      <h1 className="title-header">Editar Perfil</h1>
      <div className="header-users">
        <hr className="borda-users"></hr>
        <h2 className="title-users">Usuários</h2>
        <hr className="borda-users"></hr>
      </div>

      {!showCreateUserForm ? (
        <div className="create-user-toolbar">
          <button
            className="btn-create-user"
            onClick={() => setShowCreateUserForm(true)}
            disabled={loading}
          >
            + Criar Novo Usuário
          </button>
        </div>
      ) : (
        <form className="create-user-form" onSubmit={handleCreateUser}>
          <h3>Novo Usuário</h3>
          <div className="form-group">
            <label htmlFor="newUserEmail">Email</label>
            <input
              id="newUserEmail"
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="newUserName">Nome</label>
            <input
              id="newUserName"
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Nome completo"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="newUserSetor">Setor</label>
            <select
              id="newUserSetor"
              value={newUserSetor}
              onChange={(e) => setNewUserSetor(e.target.value as SetorValue)}
              required
            >
              <option value="">Selecione</option>
              {setores.map((setor) => (
                <option key={setor.value} value={setor.value}>
                  {setor.label}
                </option>
              ))}
            </select>
          </div>
          <div className="action-button">
            <button type="submit" disabled={loading}>Criar</button>
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
        {allUsers.map((u: Usuario) => (
          <li className="users-information" key={u.usuarioID}>
            {editingUserId === u.usuarioID ? (
              <div className="user-edit-row">
                <div className="user-cell user-edit-form-cell">
                  <UserEditForm
                    editingUserName={editingUserName}
                    setEditingUserName={setEditingUserName}
                    editingUserSetor={editingUserSetor}
                    setEditingUserSetor={setEditingUserSetor}
                    editingUserStatus={editingUserStatus}
                    setEditingUserStatus={setEditingUserStatus}
                    handleSubmit={handleSubmit}
                    handleCancelEdit={handleCancelEdit}
                    error={error}
                  />
                </div>
              </div>
            ) : (
              <>
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
                    disabled={u.usuarioID === usuarioLogado?.usuarioID}
                    onClick={() => handleEditOtherUser(u)}
                    title="Editar usuário"
                  >
                    Editar
                  </button>
                  <button
                    className="users-deactivate-button"
                    disabled={u.usuarioID === usuarioLogado?.usuarioID}
                    onClick={() =>
                      u.statusConta
                        ? handleDeactivateUser(u.usuarioID)
                        : handleActivateUser(u.usuarioID)
                    }
                    title={u.statusConta ? "Desativar usuário" : "Ativar usuário"}
                  >
                    {u.statusConta ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    className="users-delete-button"
                    disabled={u.usuarioID === usuarioLogado?.usuarioID}
                    onClick={() => handleDeleteUser(u.usuarioID)}
                    title="Deletar usuário"
                  >
                    Deletar
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
