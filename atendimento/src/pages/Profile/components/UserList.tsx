/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Usuario } from "../../../types/Usuario";
import UserEditForm from "./UserEditForm";

export default function UserList({
  allUsers,
  usuarioLogado,
  handleEditOtherUser,
  editingUserId,
  editingUserName,
  setEditingUserName,
  editingUserSetor,
  setEditingUserSetor,
  editingUserStatus,
  setEditingUserStatus,
  handleSubmit,
  handleCancelEdit,
  error,
}: any) {
  return (
    <div className="users-form-edit">
      <h1 className="title-header">Editar Perfil</h1>
      <div className="header-users">
        <hr className="borda-users"></hr>
        <h2 className="title-users">Usuários</h2>
        <hr className="borda-users"></hr>
      </div>
      <ul className="users-list">
        {allUsers.map((u: Usuario) => (
          <li className="users-row" key={u.usuarioID}>
            {editingUserId === u.usuarioID ? (
              <div className="user-edit-row">
                {/* Formulário de edição */}
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
                <div className="user-cell user-name-cell">
                  <span className="user-name" title="Nome do Usuario">
                    {u.displayName}
                  </span>
                </div>
                <div className="user-cell user-email-cell">
                  <span className="user-email" title="Email do Usuario">
                    {u.email}
                  </span>
                </div>
                <div className="user-cell user-action-cell">
                  <button
                    id="user-action-btn"
                    title="Editar usuário"
                    disabled={u.usuarioID === usuarioLogado?.usuarioID}
                    onClick={() => handleEditOtherUser(u)}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 45 45"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 6.99996H6C4.93913 6.99996 3.92172 7.42139 3.17157 8.17154C2.42143 8.92168 2 9.9391 2 11V39C2 40.0608 2.42143 41.0782 3.17157 41.8284C3.92172 42.5785 4.93913 43 6 43H34C35.0609 43 36.0783 42.5785 36.8284 41.8284C37.5786 41.0782 38 40.0608 38 39V25M35 3.99996C35.7956 3.20432 36.8748 2.75732 38 2.75732C39.1252 2.75732 40.2044 3.20432 41 3.99996C41.7956 4.79561 42.2426 5.87475 42.2426 6.99996C42.2426 8.12518 41.7956 9.20432 41 9.99996L22 29L14 31L16 23L35 3.99996Z"
                        stroke="#222"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
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
