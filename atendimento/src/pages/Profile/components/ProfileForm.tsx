/* eslint-disable @typescript-eslint/no-explicit-any */
import { setores, type SetorValue } from "../../../types/Setores";

export default function ProfileForm({
  profileName,
  setProfileName,
  setor,
  setSetor,
  handleSubmit,
  error,
}: any) {
  return (
    <form onSubmit={handleSubmit} id="profile-form-edit">
      {error && <p className="profile-error">{error}</p>}
      <h1 className="title-header">Editar Perfil</h1>
      <div className="form-group-name">
        <label>Nome</label>
        <input
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
        />
      </div>
      <div className="form-group-setor">
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
    </form>
  );
}
