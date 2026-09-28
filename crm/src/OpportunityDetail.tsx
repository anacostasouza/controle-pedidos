import { useEffect, useState } from "react";
import { api, money, displayDate, today } from "./services/crmApi";
import type {
  Bootstrap,
  Client,
  Company,
  Detail,
  History,
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
  async function load() {
    const d = await api<Detail>(`/opportunities/${id}`);
    setData(d);
    setRating(d.opportunity.rating);
    setHistoryCursor(d.history.length === 40 ? d.history[39].id : null);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [id]);
  async function action(name: string, body: Record<string, unknown>) {
    if (!data) return;
    setNotice("");
    try {
      await api(`/opportunities/${id}/actions`, "POST", {
        ...body,
        action: name,
        version: data.opportunity.version,
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
    <Modal title={c?.name || "Oportunidade"} close={close}>
      {error && <p className="error">{error}</p>}
      {boot.actor.role === 'admin' && <button type="button" className="danger-button" onClick={() => void deleteOpportunity()}>Excluir oportunidade</button>}
      {!o || !data ? (
        <p>Carregando oportunidade…</p>
      ) : (
        <>
          <div className="detail-summary">
            <div>
              <p>{company?.name || "Sem empresa vinculada"}</p>
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
              <strong>{money(o.valueCents)}</strong>
              <Stars value={o.rating} />
            </div>
          </div>
          <div className="meta-line">
            Criada em {displayDate(o.createdAt)} · Proposta enviada em{" "}
            {displayDate(o.sentDate)}
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
                  onClick={() => setTab(t)}
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
              <AsyncForm
                key={o.version}
                disabled={!data.canEdit || o.state !== "active"}
                label="Salvar dados"
                save={async (f) => {
                  await action("edit", {
                    ownerId: str(f, "ownerId"),
                    channel: str(f, "channel"),
                    serviceGroup: str(f, "serviceGroup"),
                    notes: str(f, "notes"),
                    valueCents:
                      str(f, "value") === ""
                        ? null
                        : Math.round(Number(str(f, "value")) * 100),
                    rating,
                    complexity: str(f, "complexity"),
                    estimatorId: str(f, "estimatorId"),
                    budgetStatus: str(f, "budgetStatus"),
                  });
                }}
              >
                <fieldset disabled={!data.canEdit || o.state !== "active"}>
                  <div className="form-grid">
                    <Field label="Vendedor">
                      <select name="ownerId" defaultValue={o.ownerId}>
                        <option value="">Aguardando distribuição</option>
                        {boot.users
                          .filter(
                            (u) =>
                              u.id === o.ownerId ||
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
                        defaultValue={
                          o.valueCents === null ? "" : o.valueCents / 100
                        }
                      />
                    </Field>
                    <Field label="Canal de entrada">
                      <select name="channel" defaultValue={o.channel}>
                        <option value="">Não informado</option>
                        {[
                          ...new Set([
                            ...boot.settings.channels,
                            ...(o.channel ? [o.channel] : []),
                          ]),
                        ].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Grupo de serviços">
                      <select name="serviceGroup" defaultValue={o.serviceGroup}>
                        <option value="">Não informado</option>
                        {[
                          ...new Set([
                            ...boot.settings.serviceGroups,
                            ...(o.serviceGroup ? [o.serviceGroup] : []),
                          ]),
                        ].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Probabilidade de fechamento">
                      <span>
                        <Stars
                          value={rating}
                          onChange={setRating}
                          disabled={!data.canEdit || o.state !== "active"}
                        />
                        <small>
                          {rating
                            ? `${rating} de 5 · clique novamente para limpar`
                            : "Sem avaliação"}
                        </small>
                      </span>
                    </Field>
                    <Field label="Complexidade">
                      <select name="complexity" defaultValue={o.complexity}>
                        <option value="simple">Simples</option>
                        <option value="complex">Complexo</option>
                      </select>
                    </Field>
                    <Field label="Orçamentista">
                      <select name="estimatorId" defaultValue={o.estimatorId}>
                        <option value="">Não definido</option>
                        {boot.users
                          .filter(
                            (u) =>
                              u.id === o.estimatorId ||
                              (u.active &&
                                [
                                  "orcamentista",
                                  "admin",
                                  "coordenacao",
                                ].includes(u.role)),
                          )
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label="Situação do orçamento">
                      <select name="budgetStatus" defaultValue={o.budgetStatus}>
                        {[
                          "A elaborar",
                          "Em elaboração",
                          "Recebido/concluído",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Anotações" wide>
                      <textarea
                        name="notes"
                        rows={4}
                        defaultValue={o.notes}
                        maxLength={10000}
                      />
                    </Field>
                  </div>
                </fieldset>
              </AsyncForm>
              <div className="approval-note">
                <strong>Validação: {o.approval}</strong>
                <p>
                  A validação da proposta complexa não bloqueia a oportunidade.
                </p>
                {!boot.settings.approverIds.length && (
                  <small>
                    Responsável pela validação ainda não configurado.
                  </small>
                )}
              </div>
              {o.state === "active" &&
                boot.settings.approverIds.includes(boot.actor.uid) &&
                o.complexity === "complex" && (
                  <details className="action-block">
                    <summary>Registrar validação</summary>
                    <AsyncForm
                      save={async (f) => {
                        await action("approve", {
                          approval: str(f, "approval"),
                          notes: str(f, "notes"),
                        });
                      }}
                    >
                      <Field label="Status">
                        <select name="approval" defaultValue={o.approval}>
                          {["Pendente", "Aprovada", "Não aprovada"].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Observações">
                        <textarea name="notes" />
                      </Field>
                    </AsyncForm>
                  </details>
                )}
              {o.state === "active" &&
                boot.actor.role === "orcamentista" &&
                o.estimatorId === boot.actor.uid && (
                  <details className="action-block">
                    <summary>Atualizar elaboração do orçamento</summary>
                    <AsyncForm
                      save={async (f) => {
                        await action("budget", {
                          budgetStatus: str(f, "budgetStatus"),
                        });
                      }}
                    >
                      <Field label="Situação">
                        <select
                          name="budgetStatus"
                          defaultValue={o.budgetStatus}
                        >
                          {[
                            "A elaborar",
                            "Em elaboração",
                            "Recebido/concluído",
                          ].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </Field>
                    </AsyncForm>
                  </details>
                )}
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
                        : "Serão criadas tarefas em D+1, D+3 e D+7 úteis."}
                    </p>
                    <AsyncForm
                      label={
                        o.sentDate ? "Iniciar novo ciclo" : "Registrar envio"
                      }
                      save={async (f) => {
                        await action("send", {
                          sentDate: str(f, "sentDate"),
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
                                ["admin", "coordenacao"].includes(u.role),
                            )
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
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
