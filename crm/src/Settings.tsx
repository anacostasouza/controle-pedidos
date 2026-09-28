import { useState } from "react";
import { api, roleLabels } from "./services/crmApi";
import type { Bootstrap, Role } from "./services/crmApi";
import { AsyncForm, Field, str } from "./components";
import { ApproverPicker } from "./components/settings/ApproverPicker";

const roles: Role[] = [
  "leitura",
  "recepcao",
  "vendedor",
  "orcamentista",
  "coordenacao",
  "admin",
];

export function SettingsPage({
  boot,
  reload,
}: {
  boot: Bootstrap;
  reload: () => Promise<void>;
}) {
  const [notice, setNotice] = useState("");
  const lines = (form: FormData, key: string) =>
    str(form, key)
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);

  async function saveSettings(form: FormData) {
    await api("/settings", "PUT", {
      channels: lines(form, "channels"),
      serviceGroups: lines(form, "serviceGroups"),
      holidays: lines(form, "holidays"),
      approverIds: form.getAll("approvers"),
    });
    await reload();
    setNotice(
      "Configurações atualizadas. Novos cálculos usarão este calendário.",
    );
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRAÇÃO</p>
          <h1>Uma operação com as suas regras.</h1>
          <p>Calendário, classificações e acesso ao CRM.</p>
        </div>
      </div>
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      <CommercialSettings boot={boot} reload={reload} save={saveSettings} />
      <UserAccessSettings boot={boot} reload={reload} onNotice={setNotice} />
    </section>
  );
}

function CommercialSettings({
  boot,
  reload,
  save,
}: {
  boot: Bootstrap;
  reload: () => Promise<void>;
  save: (form: FormData) => Promise<void>;
}) {
  return (
    <section className="panel padded">
      <h2>Parâmetros comerciais</h2>
      <details className="action-block">
        <summary>Aproveitar grupos de serviços existentes</summary>
        <AsyncForm
          label="Importar grupos da base existente"
          save={async () => {
            await api("/settings/import-services", "POST", {});
            await reload();
          }}
        >
          <p>
            Acrescenta os grupos cadastrados em servicosStatus à lista do CRM,
            preservando os já configurados.
          </p>
        </AsyncForm>
      </details>
      <AsyncForm key={boot.settings.serviceGroups.join("|")} save={save}>
        <div className="form-grid">
          <Field label="Canais de entrada (um por linha)">
            <textarea
              name="channels"
              rows={7}
              defaultValue={boot.settings.channels.join("\n")}
            />
          </Field>
          <Field label="Grupos de serviços (um por linha)">
            <textarea
              name="serviceGroups"
              rows={7}
              defaultValue={boot.settings.serviceGroups.join("\n")}
            />
          </Field>
          <Field label="Feriados · AAAA-MM-DD, um por linha">
            <textarea
              name="holidays"
              rows={7}
              defaultValue={boot.settings.holidays.join("\n")}
              placeholder="2026-12-25"
            />
          </Field>
          <Field label="Validadores de propostas complexas">
            <ApproverPicker
              users={boot.users}
              defaultValue={boot.settings.approverIds}
            />
            <small>
              Selecione usuários habilitados para validar propostas complexas.
            </small>
          </Field>
        </div>
        <p className="muted">
          Fuso: America/Sao_Paulo. Sábados e domingos não são úteis.
        </p>
      </AsyncForm>
    </section>
  );
}

function UserAccessSettings({
  boot,
  reload,
  onNotice,
}: {
  boot: Bootstrap;
  reload: () => Promise<void>;
  onNotice: (message: string) => void;
}) {
  return (
    <section className="panel padded">
      <h2>Usuários da base existente</h2>
      <p>
        As contas Google e a situação da conta continuam sendo administradas no
        sistema existente. Aqui você define o perfil específico do CRM.
      </p>
      <div className="user-settings">
        {boot.users.map((user) => (
          <article key={user.id}>
            <h3>{user.name}</h3>
            <small>
              {user.sector || "Setor não informado"} ·{" "}
              {user.active ? "Ativo" : "Inativo"}
            </small>
            {user.id === boot.actor.uid ? (
              <p>Seu perfil: {roleLabels[user.role]}</p>
            ) : (
              <AsyncForm
                label="Atualizar acesso"
                save={async (form) => {
                  await api(`/access/${user.id}`, "PUT", {
                    role: str(form, "role"),
                    enabled: str(form, "enabled") === "true",
                  });
                  await reload();
                  onNotice(`Acesso de ${user.name} atualizado.`);
                }}
              >
                <Field label="Perfil no CRM">
                  <select name="role" defaultValue={user.role}>
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Acesso ao CRM">
                  <select name="enabled" defaultValue={String(user.active)}>
                    <option value="true">Habilitado</option>
                    <option value="false">Desabilitado</option>
                  </select>
                </Field>
              </AsyncForm>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
