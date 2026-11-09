import { useEffect, useRef, useState } from "react";
import { api, money, displayDate, today, roleLabels } from "./services/crmApi";
import type {
  Bootstrap,
  Client,
  Company,
  Detail,
  History,
  Opportunity,
  Task,
} from "./services/crmApi";
import { AsyncForm, Empty, Field, Modal, Stars, str } from "./components";
import {
  CloseForm,
  StageForm,
} from "./components/opportunity/OpportunityActions";
import type { Action } from "./components/opportunity/OpportunityActions";
const actionNames: Record<string, string> = {
  create: "Oportunidade criada",
  edit: "Dados atualizados",
  send: "Proposta enviada",
  correctSentDate: "Data de envio corrigida",
  stage: "Etapa alterada",
  approve: "Validação registrada",
  budget: "Orçamento atualizado",
  reschedule: "Acompanhamento reagendado",
  next: "Próximo contato agendado",
  contact: "Contato registrado",
  objection: "Objeção registrada",
  close: "Oportunidade concluída",
  reopen: "Oportunidade reativada",
  archive: "Arquivamento automático",
};
export function OpportunityDetail({
  id,
  boot,
  clients,
  companies,
  close,
  changed,
}: {
  id: string;
  boot: Bootstrap;
  clients: Client[];
  companies: Company[];
  close: () => void;
  changed: () => void;
}) {
  const [data, setData] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState("Dados"),
    [rating, setRating] = useState(0),
    [historyCursor, setHistoryCursor] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ownerId: "",
    value: "",
    channel: "",
    serviceGroup: "",
    proposalNumber: "",
    notes: "",
  });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const isDirtyRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedValuesRef = useRef<string>("");
  const currentVersionRef = useRef<number>(0);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  const ratingRef = useRef(rating);
  ratingRef.current = rating;

  async function load() {
    const d = await api<Detail>(`/opportunities/${id}`);
    setData(d);
    currentVersionRef.current = d.opportunity.version;
    if (!isDirtyRef.current) {
      setRating(d.opportunity.rating);
      const initialForm = {
        ownerId: d.opportunity.ownerId || "",
        value: d.opportunity.valueCents === null ? "" : (d.opportunity.valueCents / 100).toString(),
        channel: d.opportunity.channel || "",
        serviceGroup: d.opportunity.serviceGroup || "",
        proposalNumber: d.opportunity.proposalNumber || "",
        notes: d.opportunity.notes || "",
      };
      setFormData(initialForm);
      lastSavedValuesRef.current = JSON.stringify({ ...initialForm, rating: d.opportunity.rating });
    }
    setHistoryCursor(d.history.length === 40 ? d.history[39].id : null);
  }

  useEffect(() => {
    isDirtyRef.current = false;
    lastSavedValuesRef.current = "";
    setSaveStatus("idle");
    setSaveError("");
    load().catch((e) => setError(e.message));
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [id]);

  const performSave = async (dataToSave = formDataRef.current, ratingToSave = ratingRef.current) => {
    if (!data || !data.canEdit || data.opportunity.state !== "active") return;
    const serialized = JSON.stringify({ ...dataToSave, rating: ratingToSave });
    if (serialized === lastSavedValuesRef.current) {
      isDirtyRef.current = false;
      return;
    }
    setSaveStatus("saving");
    setSaveError("");
    try {
      const rawVal = dataToSave.value.trim();
      const valueCents = rawVal === "" ? null : Math.round(Number(rawVal) * 100);
      const res = await api<{ opportunity: Opportunity; tasks: Task[] }>(
        `/opportunities/${id}/actions`,
        "POST",
        {
          ownerId: dataToSave.ownerId,
          channel: dataToSave.channel,
          serviceGroup: dataToSave.serviceGroup,
          notes: dataToSave.notes,
          proposalNumber: dataToSave.proposalNumber,
          valueCents,
          rating: ratingToSave,
          action: "edit",
          version: currentVersionRef.current || data.opportunity.version,
        }
      );
      currentVersionRef.current = res.opportunity.version;
      lastSavedValuesRef.current = serialized;
      isDirtyRef.current = false;
      setSaveStatus("saved");
      setData((prev) => (prev ? { ...prev, opportunity: res.opportunity, tasks: res.tasks } : prev));
      changed();
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : "Não foi possível salvar os dados.");
      await load();
    }
  };

  const scheduleSave = (newFormData: typeof formData, newRating: number, delayMs = 800) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    isDirtyRef.current = true;
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(() => {
      void performSave(newFormData, newRating);
    }, delayMs);
  };

  const handleClose = async () => {
    if (isDirtyRef.current) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      await performSave(formDataRef.current, ratingRef.current);
    }
    close();
  };

  async function action(name: string, body: Record<string, unknown>) {
    if (!data) return;
    if (isDirtyRef.current && name !== "edit") {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      await performSave(formDataRef.current, ratingRef.current);
    }
    setNotice("");
    try {
      await api(`/opportunities/${id}/actions`, "POST", {
        ...body,
        action: name,
        version: currentVersionRef.current || data.opportunity.version,
      });
    } catch (e) {
      await load();
      throw e;
    }
    await load();
    changed();
    setNotice(
      name === "contact"
        ? "Contato registrado. Mais um passo realizado!"
        : name === "next"
          ? "Agendamento concluído."
          : name === "deleteTask"
            ? "Agendamento excluído."
        : "Alteração salva.",
    );
  }
  async function deleteOpportunity() {
    if (!window.confirm('Excluir esta oportunidade e todo o seu histórico?')) return;
    try {
      await api(`/opportunities/${id}`, 'DELETE');
      close();
      changed();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível excluir a oportunidade.');
    }
  }
  const o = data?.opportunity,
    c = clients.find((c) => c.id === o?.clientId),
    company = companies.find((e) => e.id === c?.companyId);
  return (
    <Modal title={(c?.name || "Oportunidade").toUpperCase()} close={handleClose} closeOnBackdrop={false}>
      {error && <p className="error">{error}</p>}
      {['admin', 'coordenacao', 'vendedor', 'recepcao'].includes(boot.actor.role) && <button type="button" className="danger-button" onClick={() => void deleteOpportunity()}>Excluir oportunidade</button>}
      {!o || !data ? (
        <p>Carregando oportunidade…</p>
      ) : (
        <>
          <div className="detail-summary">
            <div>
              <p>{company?.name ? company.name.toUpperCase() : "Sem empresa vinculada"}</p>
              <p>
                {c?.phone}{" "}
                {c?.email && (
                  <>
                    {" "}
                    · <a href={`mailto:${c.email}`}>{c.email}</a>
                  </>
                )}
              </p>
              <span className="badge">
                {o.state === "archived"
                  ? "Arquivada"
                  : o.state === "closed"
                    ? o.outcome
                    : o.stage}
              </span>
            </div>
            <div>
              <strong>{money(formData.value.trim() !== "" ? Math.round(Number(formData.value) * 100) : o.valueCents)}</strong>
              <Stars value={rating} />
            </div>
          </div>
          <div className="meta-line">
            Criada em {displayDate(o.createdAt)} · Proposta enviada em{" "}
            {displayDate(o.sentDate)}
            {" · Número da proposta: "}{formData.proposalNumber || o.proposalNumber || "Não informado"}
            {o.archiveDate && (
              <> · Arquivamento previsto: {displayDate(o.archiveDate)}</>
            )}
          </div>
          {notice && (
            <p className="success" role="status">
              {notice}
            </p>
          )}
          {!data.canEdit && (
            <p className="muted">
              Consulta compartilhada. As alterações seguem as permissões do seu
              perfil.
            </p>
          )}
          <div className="tabs">
            {["Dados", "Acompanhamentos", "Negociação", "Histórico"].map(
              (t) => (
                <button
                  className={tab === t ? "active" : ""}
                  key={t}
                  onClick={() => {
                    if (isDirtyRef.current) {
                      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                      void performSave(formDataRef.current, ratingRef.current);
                    }
                    setTab(t);
                  }}
                >
                  {t}
                  {t === "Acompanhamentos" && (
                    <span className="count">
                      {data.tasks.filter((t) => t.status === "pending").length}
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
          {tab === "Dados" && (
            <>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                  await performSave(formData, rating);
                }}
              >
                <fieldset disabled={!data.canEdit || o.state !== "active"}>
                  <div className="form-grid">
                    <Field label="Vendedor">
                      <select
                        name="ownerId"
                        value={formData.ownerId}
                        onChange={(e) => {
                          const next = { ...formData, ownerId: e.target.value };
                          setFormData(next);
                          scheduleSave(next, rating, 200);
                        }}
                      >
                        <option value="">Aguardando distribuição</option>
                        {boot.users
                          .filter(
                            (u) =>
                              u.id === formData.ownerId ||
                              (u.active &&
                                ["vendedor", "admin", "coordenacao"].includes(
                                  u.role,
                                )),
                          )
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                              {!u.active ? " (inativo)" : ""}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label="Valor (R$)">
                      <input
                        name="value"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.value}
                        onChange={(e) => {
                          const next = { ...formData, value: e.target.value };
                          setFormData(next);
                          scheduleSave(next, rating);
                        }}
                        onBlur={() => {
                          if (isDirtyRef.current) {
                            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                            void performSave(formData, rating);
                          }
                        }}
                      />
                    </Field>
                    <Field label="Canal de entrada">
                      <select
                        name="channel"
                        value={formData.channel}
                        onChange={(e) => {
                          const next = { ...formData, channel: e.target.value };
                          setFormData(next);
                          scheduleSave(next, rating, 200);
                        }}
                      >
                        <option value="">Não informado</option>
                        {[
                          ...new Set([
                            ...boot.settings.channels,
                            ...(formData.channel ? [formData.channel] : []),
                          ]),
                        ].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Grupo de serviços">
                      <select
                        name="serviceGroup"
                        value={formData.serviceGroup}
                        onChange={(e) => {
                          const next = { ...formData, serviceGroup: e.target.value };
                          setFormData(next);
                          scheduleSave(next, rating, 200);
                        }}
                      >
                        <option value="">Não informado</option>
                        {[
                          ...new Set([
                            ...boot.settings.serviceGroups,
                            ...(formData.serviceGroup ? [formData.serviceGroup] : []),
                          ]),
                        ].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Número da proposta">
                      <input
                        name="proposalNumber"
                        maxLength={100}
                        value={formData.proposalNumber}
                        onChange={(e) => {
                          const next = { ...formData, proposalNumber: e.target.value };
                          setFormData(next);
                          scheduleSave(next, rating);
                        }}
                        onBlur={() => {
                          if (isDirtyRef.current) {
                            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                            void performSave(formData, rating);
                          }
                        }}
                        placeholder="Informado pelo ERP"
                      />
                    </Field>
                    <Field label="Probabilidade de fechamento">
                      <span>
                        <Stars
                          value={rating}
                          onChange={(newRating) => {
                            setRating(newRating);
                            scheduleSave(formData, newRating, 200);
                          }}
                          disabled={!data.canEdit || o.state !== "active"}
                        />
                        <small>
                          {rating
                            ? `${rating} de 5 · clique novamente para limpar`
                            : "Sem avaliação"}
                        </small>
                      </span>
                    </Field>

                    <Field label="Anotações" wide>
                      <textarea
                        name="notes"
                        rows={4}
                        value={formData.notes}
                        onChange={(e) => {
                          const next = { ...formData, notes: e.target.value };
                          setFormData(next);
                          scheduleSave(next, rating);
                        }}
                        onBlur={() => {
                          if (isDirtyRef.current) {
                            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                            void performSave(formData, rating);
                          }
                        }}
                        maxLength={10000}
                      />
                    </Field>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <button
                      className="primary"
                      disabled={!data.canEdit || o.state !== "active" || saveStatus === "saving"}
                      type="submit"
                    >
                      {saveStatus === "saving" ? "Salvando…" : "Salvar dados"}
                    </button>
                    <div className={`auto-save-status ${saveStatus}`}>
                      {saveStatus === 'saving' && <span>Salvando alterações…</span>}
                      {saveStatus === 'saved' && <span>✓ Todas as alterações salvas</span>}
                      {saveStatus === 'error' && <span>{saveError || 'Erro ao salvar alterações.'}</span>}
                      {saveStatus === 'idle' && <span>Salvamento automático ativo</span>}
                    </div>
                  </div>
                </fieldset>
              </form>
              {data.canEdit && o.state === "active" && (
                <>
                  <details className="action-block">
                    <summary>
                      {o.sentDate
                        ? "Registrar reenvio da proposta"
                        : "Registrar envio da proposta"}
                    </summary>
                    <p>
                      O documento é enviado fora do CRM.{" "}
                      {o.sentDate
                        ? "O reenvio inicia novo ciclo e cancela os acompanhamentos pendentes do anterior."
                        : "Serão criadas tarefas em D+1, D+2, D+3 e D+7 úteis."}
                    </p>
                    <AsyncForm
                      label={
                        o.sentDate ? "Iniciar novo ciclo" : "Registrar envio"
                      }
                      save={async (f) => {
                        await action("send", {
                          sentDate: str(f, "sentDate"),
                          proposalNumber: str(f, "proposalNumber"),
                          newCycle: !!o.sentDate,
                        });
                        setTab("Acompanhamentos");
                      }}
                    >
                      <Field label="Data do envio">
                        <input
                          name="sentDate"
                          type="date"
                          required
                          max={today()}
                          defaultValue={today()}
                        />
                      </Field>
                      <Field label="Número da proposta">
                        <input
                          name="proposalNumber"
                          maxLength={100}
                          defaultValue={o.proposalNumber || ""}
                          placeholder="Informado pelo ERP"
                        />
                      </Field>
                    </AsyncForm>
                  </details>
                  {o.sentDate && (
                    <details className="action-block">
                      <summary>Corrigir data de envio sem novo ciclo</summary>
                      <p>
                        Recalcula os marcos automáticos pendentes; preserva
                        datas manuais e contatos concluídos.
                      </p>
                      <AsyncForm
                        save={async (f) => {
                          await action("correctSentDate", {
                            sentDate: str(f, "sentDate"),
                          });
                        }}
                      >
                        <Field label="Data correta">
                          <input
                            type="date"
                            name="sentDate"
                            required
                            max={today()}
                            defaultValue={o.sentDate}
                          />
                        </Field>
                      </AsyncForm>
                    </details>
                  )}
                  <StageForm o={o} action={action} />
                  <CloseForm action={action} />
                </>
              )}
              {data.canEdit && o.state !== "active" && (
                <details className="action-block" open>
                  <summary>Reativar oportunidade</summary>
                  <AsyncForm
                    label="Reativar"
                    save={async (f) => {
                      await action("reopen", {
                        reason: str(f, "reason"),
                        dueDate: str(f, "dueDate"),
                      });
                    }}
                  >
                    <Field label="Motivo">
                      <textarea name="reason" required />
                    </Field>
                    {o.sentDate && (
                      <Field label="Próximo contato">
                        <input
                          type="date"
                          name="dueDate"
                          required
                          min={today()}
                          defaultValue={today()}
                        />
                      </Field>
                    )}
                  </AsyncForm>
                </details>
              )}
              {o.state === "closed" && (
                <p className="result-box">
                  {o.outcome} · {o.lossReason} {o.closingNotes}
                </p>
              )}
            </>
          )}
          {tab === "Acompanhamentos" && (
            <>
              {data.canEdit && o.state === "active" && o.sentDate && (
                <details className="action-block">
                  <summary>＋ Agendar próximo follow-up</summary>
                  <AsyncForm
                    label="Agendar"
                    save={async (f) => {
                      await action("next", {
                        dueDate: str(f, "dueDate"),
                        notes: str(f, "notes"),
                      });
                    }}
                  >
                    <Field label="Nova data">
                      <input
                        type="date"
                        name="dueDate"
                        required
                        min={today()}
                        defaultValue={today()}
                      />
                    </Field>
                    <Field label="Próxima ação">
                      <textarea name="notes" />
                    </Field>
                  </AsyncForm>
                </details>
              )}
              {!data.tasks.length ? (
                <Empty>
                  Registre o envio da proposta para iniciar os acompanhamentos.
                </Empty>
              ) : (
                [...data.tasks]
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .map((t) => (
                    <TaskCard
                      key={`${t.id}_${o.version}`}
                      task={t}
                      editable={
                        (data.canEdit ||
                          (t.kind === "Coordenação" &&
                            t.ownerId === boot.actor.uid)) &&
                        o.state !== "closed"
                      }
                      action={action}
                    />
                  ))
              )}
            </>
          )}
          {tab === "Negociação" && (
            <>
              <p>
                Registre a objeção, a estratégia de tratamento e solicite apoio
                quando necessário.
              </p>
              {o.objection && <blockquote>{o.objection}</blockquote>}
              {data.canEdit && o.state === "active" && (
                <>
                  <StageForm o={o} action={action} />
                  <AsyncForm
                    label="Registrar objeção"
                    save={async (f) => {
                      await action("objection", {
                        objection: str(f, "objection"),
                        coordinatorId: str(f, "coordinatorId"),
                        dueDate: str(f, "dueDate"),
                      });
                    }}
                  >
                    <Field label="Objeção e estratégia">
                      <textarea
                        name="objection"
                        rows={4}
                        required
                        defaultValue={o.objection}
                      />
                    </Field>
                    <div className="form-grid">
                      <Field label="Solicitar apoio">
                        <select name="coordinatorId">
                          <option value="">Sem solicitação de apoio</option>
                          {boot.users
                            .filter(
                              (u) =>
                                u.active &&
                                ["admin", "coordenacao", "vendedor"].includes(u.role) &&
                                u.id !== boot.actor.uid,
                            )
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({roleLabels[u.role] || u.role})
                              </option>
                            ))}
                        </select>
                      </Field>
                      <Field label="Data para apoio">
                        <input
                          type="date"
                          name="dueDate"
                          min={today()}
                          defaultValue={today()}
                        />
                      </Field>
                    </div>
                  </AsyncForm>
                  <CloseForm action={action} />
                </>
              )}
            </>
          )}
          {tab === "Histórico" && (
            <>
              <ol className="timeline">
                {data.history.map((h) => (
                  <li key={h.id}>
                    <strong>{actionNames[h.action] || h.action}</strong>
                    <small>
                      {h.actorName} ·{" "}
                      {new Date(h.at).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
                    </small>
                    {h.notes && <p>{h.notes}</p>}
                    {h.reason && <p>{h.reason}</p>}
                    {h.changes && (
                      <details>
                        <summary>Ver alterações</summary>
                        <pre>{JSON.stringify(h.changes, null, 2)}</pre>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
              {historyCursor && (
                <button
                  onClick={async () => {
                    try {
                      const more = await api<{
                        items: History[];
                        nextCursor: string | null;
                      }>(
                        `/opportunities/${id}/history?cursor=${historyCursor}`,
                      );
                      setData({
                        ...data,
                        history: [...data.history, ...more.items],
                      });
                      setHistoryCursor(more.nextCursor);
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Falha ao carregar histórico.",
                      );
                    }
                  }}
                >
                  Carregar registros anteriores
                </button>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
}
function TaskCard({
  task: t,
  editable,
  action,
}: {
  task: Task;
  editable: boolean;
  action: Action;
}) {
  const [result, setResult] = useState("Sem resposta");
  const overdue = t.status === "pending" && t.dueDate < today();
  return (
    <article className={`task-card ${overdue ? "is-overdue" : ""}`}>
      <div className="section-title">
        <h3>
          {t.kind}{" "}
          <span className="badge">
            {t.status === "pending"
              ? overdue
                ? "Em atraso"
                : "Pendente"
              : t.status === "done"
                ? "Concluída"
                : "Cancelada"}
          </span>
        </h3>
        <strong>{displayDate(t.dueDate)}</strong>
      </div>
      {t.source === "manual" && (
        <small>
          Data definida manualmente · vencimento original:{" "}
          {displayDate(t.originalDueDate)}
        </small>
      )}
      {t.notes && <p>{t.notes}</p>}
      {t.status === "done" && (
        <p>
          {t.result} · contato em {displayDate(t.completedDate)}
        </p>
      )}
      {t.reschedules.length > 0 && (
        <details>
          <summary>{t.reschedules.length} alteração(ões) de data</summary>
          {t.reschedules.map((r, i) => (
            <p key={i}>
              {displayDate(r.from)} → {displayDate(r.to)} · {r.reason}
            </p>
          ))}
        </details>
      )}
      {editable && t.status === "pending" && (
        <div className="task-actions">
          <details>
            <summary>Registrar contato</summary>
            <AsyncForm
              label="Concluir acompanhamento"
              save={async (f) => {
                await action("contact", {
                  taskId: t.id,
                  result,
                  contactDate: str(f, "contactDate"),
                  notes: str(f, "notes"),
                  nextDate: str(f, "nextDate"),
                });
              }}
            >
              <Field label="Resultado do contato">
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                >
                  {[
                    "Sem resposta",
                    "Respondeu",
                    ...(t.kind === "Coordenação" ? [] : ["Em negociação"]),
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Data em que o contato foi realizado">
                <input
                  name="contactDate"
                  type="date"
                  required
                  min={today(new Date(t.createdAt))}
                  max={today()}
                  defaultValue={today()}
                />
              </Field>
              <Field label="Anotações">
                <textarea name="notes" />
              </Field>
              {result === "Em negociação" && (
                <Field label="Próximo follow-up">
                  <input
                    name="nextDate"
                    type="date"
                    required
                    min={today()}
                    defaultValue={today()}
                  />
                </Field>
              )}
            </AsyncForm>
          </details>
          <details>
            <summary>Reagendar</summary>
            <AsyncForm
              label="Salvar nova data"
              save={async (f) => {
                await action("reschedule", {
                  taskId: t.id,
                  dueDate: str(f, "dueDate"),
                  reason: str(f, "reason"),
                });
              }}
            >
              <Field label="Nova data">
                <input name="dueDate" type="date" required min={today()} />
              </Field>
              <Field label="Justificativa">
                <textarea name="reason" required />
              </Field>
            </AsyncForm>
          </details>
          {t.source === "manual" && (
            <button
              type="button"
              className="text-button danger-button"
              onClick={() => {
                if (window.confirm("Excluir este agendamento?")) {
                  void action("deleteTask", { taskId: t.id });
                }
              }}
            >
              Excluir agendamento
            </button>
          )}
        </div>
      )}
    </article>
  );
}
