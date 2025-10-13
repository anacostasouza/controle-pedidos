/* eslint-disable @typescript-eslint/no-explicit-any */
import { setores, type SetorValue } from "../../../types/Setores";

export default function UserEditForm({
  editingUserName,
  setEditingUserName,
  editingUserSetor,
  setEditingUserSetor,
  editingUserStatus,
  setEditingUserStatus,
  handleSubmit,
  handleCancelEdit,
}: any) {
  return (
    <form onSubmit={handleSubmit} id="user-edit-form-modal">
      <div className="form-group">
        <label>Nome</label>
        <input
          value={editingUserName}
          onChange={(e) => setEditingUserName(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Setor</label>
        <select
          value={editingUserSetor}
          onChange={(e) => setEditingUserSetor(e.target.value as SetorValue)}
        >
          <option value="">Selecione</option>
          {setores.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Status da Conta</label>
        <select
          value={editingUserStatus ? "true" : "false"}
          onChange={(e) => setEditingUserStatus(e.target.value === "true")}
        >
          <option value="true">Ativo</option>
          <option value="false">Inativo</option>
        </select>
      </div>
      <div>
        <button type="submit">Salvar</button>
        <button type="button" onClick={handleCancelEdit}>
          Cancelar
        </button>
      </div>
    </form>
  );
}