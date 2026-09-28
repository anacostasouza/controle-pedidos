import { useEffect, useState } from "react";
import { api, all, money, displayDate, STAGES, today } from "./services/crmApi";
import type {
  Bootstrap,
  Client,
  Company,
  DayData,
  Page,
  Row,
} from "./services/crmApi";
import { Empty, Field, Stars } from "./components";
import { OpportunityDetail } from "./OpportunityDetail";
import { NewOpportunity } from "./components/workspace/NewOpportunity";
import { WorkspaceHeader } from "./components/workspace/WorkspaceHeader";
import { WorkspaceToolbar } from "./components/workspace/WorkspaceToolbar";
export function Workspace({ boot, page }: { boot: Bootstrap; page: string }) {
  const [owner, setOwner] = useState(boot.actor.uid),
    [query, setQuery] = useState(""),
    [state, setState] = useState("active"),
    [stage, setStage] = useState(""),
    [channel, setChannel] = useState(""),
    [group, setGroup] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [offset, setOffset] = useState(0),
    [result, setResult] = useState<Page<Row>>({
      items: [],
      total: 0,
      nextOffset: null,
    }),
    [day, setDay] = useState<DayData | null>(null),
    [tab, setTab] = useState("Hoje"),
    [view, setView] = useState("Kanban");
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState(""),
    [creating, setCreating] = useState(false),
    [clients, setClients] = useState<Client[]>([]),
    [companies, setCompanies] = useState<Company[]>([]);
  const [draggedOpportunity, setDraggedOpportunity] = useState<string | null>(
    null,
  );
  const refresh = () => setRevision((r) => r + 1);
  useEffect(() => {
    let active = true;
    Promise.all([all<Client>("/clients"), all<Company>("/companies")])
      .then(([c, e]) => {
        if (active) {
          setClients(c);
          setCompanies(e);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        offset: String(offset),
        state,
        stage,
        channel,
        serviceGroup: group,
        q: query,
        from,
        to,
        ...(owner === "unassigned"
          ? { unassigned: "true" }
          : owner
            ? { ownerId: owner }
            : {}),
      });
      const request =
        page === "Meu Dia"
          ? api<DayData>(
              `/day?ownerId=${encodeURIComponent(owner && owner !== "unassigned" ? owner : boot.actor.uid)}`,
            ).then((d) => {
              if (current) setDay(d);
            })
          : api<Page<Row>>(`/opportunities?${params}`).then((d) => {
              if (current) setResult(d);
            });
      request
        .catch((e) => {
          if (current) setError(e.message);
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [
    page,
    owner,
    state,
    stage,
    channel,
    group,
    query,
    from,
    to,
    offset,
    revision,
    boot.actor.uid,
  ]);
  useEffect(() => {
    if (page !== "Oportunidades" || view !== "Kanban") return;
    const cards = [
      ...document.querySelectorAll<HTMLElement>(".opportunity-card"),
    ];
    const handlers = cards.map((card) => {
      card.setAttribute("draggable", "true");
      const cardName = card.querySelector("h4")?.textContent?.trim();
      const opportunity = result.items.find(
        (item) => item.client?.name === cardName,
      );
      if (opportunity) card.dataset.opportunityId = opportunity.id;
      const handler = (event: DragEvent) => {
        if (card.dataset.opportunityId)
          event.dataTransfer?.setData("text/plain", card.dataset.opportunityId);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        setDraggedOpportunity(card.dataset.opportunityId || null);
      };
      card.addEventListener("dragstart", handler);
      return { card, handler };
    });
    return () =>
      handlers.forEach(({ card, handler }) =>
        card.removeEventListener("dragstart", handler),
      );
  }, [page, view, result.items]);
  const change = (setter: (v: string) => void, value: string) => {
    setter(value);
    setOffset(0);
  };
  const canCreate = ["admin", "coordenacao", "recepcao", "vendedor"].includes(
    boot.actor.role,
  );
  const name = boot.users.find((u) => u.id === owner)?.name || boot.actor.name;
  const taskList = (day?.tasks || []).filter((t) => {
    const matches = `${t.client?.name} ${t.company?.name}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase());
    if (!matches) return false;
    if (tab === "Concluídas")
      return t.status === "done" && t.completedDate === day?.day;
    if (tab === "Reagendadas")
      return t.reschedules.some(
        (r) => r.from === day?.day && today(new Date(r.at)) === day?.day,
      );
    if (t.status !== "pending") return false;
    if (tab === "Atrasadas") return t.dueDate < (day?.day || "");
    if (tab === "Retomadas") return t.kind === "Retomada";
    if (tab === "Próximas") return t.dueDate > (day?.day || "");
    return t.dueDate === day?.day;
  });
  async function moveOpportunity(opportunity: Row, nextStage: string) {
    if (nextStage === "Conclusão") {
      setSelected(opportunity.id);
      setDraggedOpportunity(null);
      return;
    }
    if (nextStage === opportunity.stage) {
      setDraggedOpportunity(null);
      return;
    }
    const nextDate = undefined;
    try {
      await api(`/opportunities/${opportunity.id}/actions`, "POST", {
        action: "stage",
        stage: nextStage,
        nextDate,
        version: opportunity.version,
      });
      refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível mover a oportunidade.",
      );
    } finally {
      setDraggedOpportunity(null);
    }
  }
  return (
    <section
      className={`page ${draggedOpportunity ? "is-dragging" : ""}`}
      onDragOver={(event) => {
        if ((event.target as HTMLElement).closest(".kanban-column"))
          event.preventDefault();
      }}
      onDrop={(event) => {
        const column = (event.target as HTMLElement).closest(".kanban-column");
        if (!column) return;
        const stageName = column
          .querySelector("h3")
          ?.textContent?.replace(/\d+$/, "")
          .trim();
        const opportunity = result.items.find(
          (item) => item.id === event.dataTransfer.getData("text/plain"),
        );
        if (stageName && opportunity)
          void moveOpportunity(opportunity, stageName);
      }}
    >
      <WorkspaceHeader
        page={page}
        ownerName={name}
        canCreate={canCreate}
        onCreate={() => setCreating(true)}
      />
      <WorkspaceToolbar
        boot={boot}
        page={page}
        owner={owner}
        query={query}
        loading={loading}
        onOwnerChange={(value) => change(setOwner, value)}
        onQueryChange={(value) => change(setQuery, value)}
        onRefresh={refresh}
      />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loading && (
        <p className="loading" role="status">
          Carregando a carteira…
        </p>
      )}
      {!loading && !error && page === "Meu Dia" && day && (
        <>
          <div className="metric-grid">
            <article className="metric hero-metric">
              <span>CARTEIRA ATIVA · {name.split(" ")[0]}</span>
              <strong>{money(day.metrics.portfolio)}</strong>
              <small>
                {day.metrics.activeCount} oportunidades ·{" "}
                {day.metrics.missingValue} sem valor
              </small>
              <div className="metric-decoration">↗</div>
            </article>
            <article className="metric">
              <span>CONQUISTADO NO MÊS</span>
              <strong>{money(day.metrics.wonValue)}</strong>
              <small className="positive">
                {day.metrics.wonCount} conquistas para celebrar
              </small>
            </article>
            <article className="metric">
              <span>EM NEGOCIAÇÃO</span>
              <strong>{money(day.metrics.negotiationValue)}</strong>
              <small>Conversas que estão avançando</small>
            </article>
            <article className="metric">
              <span>CONTATOS HOJE</span>
              <strong>
                {day.metrics.contacts.toString().padStart(2, "0")}
              </strong>
              <small>Cada contato faz diferença</small>
            </article>
          </div>
          <div className="progress-panel">
            <div>
              <strong>
                {day.metrics.planned
                  ? day.metrics.done === day.metrics.planned
                    ? "Acompanhamentos de hoje concluídos!"
                    : "Um passo de cada vez. Continue avançando."
                  : "Seu dia está livre para novas oportunidades."}
              </strong>
              <p>
                {day.metrics.planned
                  ? `${day.metrics.done} de ${day.metrics.planned} acompanhamentos previstos concluídos`
                  : "Nenhum acompanhamento previsto para hoje."}
              </p>
            </div>
            {day.metrics.planned > 0 && (
              <>
                <progress
                  value={day.metrics.done}
                  max={day.metrics.planned}
                  aria-label="Progresso dos acompanhamentos"
                />
                <b>
                  {Math.round((day.metrics.done / day.metrics.planned) * 100)}%
                </b>
              </>
            )}
          </div>
          <section className="panel">
            <div className="section-title">
              <h2>Sua agenda de contatos</h2>
              <small>{displayDate(day.day)}</small>
            </div>
            <div className="tabs">
              {[
                "Atrasadas",
                "Hoje",
                "Retomadas",
                "Próximas",
                "Reagendadas",
                "Concluídas",
              ].map((t) => (
                <button
                  key={t}
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                >
                  {t}
                  {t === "Atrasadas" && (
                    <span className="count">
                      {
                        day.tasks.filter(
                          (x) => x.status === "pending" && x.dueDate < day.day,
                        ).length
                      }
                    </span>
                  )}
                </button>
              ))}
            </div>
            {!taskList.length ? (
              <Empty>Nenhum acompanhamento nesta seleção.</Empty>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente / Empresa</th>
                      <th>Oportunidade</th>
                      <th>Vencimento</th>
                      <th>Avaliação</th>
                      <th>Próximo passo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskList.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.client?.name || "Cliente"}</strong>
                          <small>{t.company?.name || "Pessoa física"}</small>
                        </td>
                        <td>
                          {money(t.opportunity?.valueCents)}
                          <small>{t.opportunity?.stage}</small>
                        </td>
                        <td>
                          <span
                            className={
                              t.status === "pending" && t.dueDate < day.day
                                ? "overdue"
                                : ""
                            }
                          >
                            {displayDate(t.dueDate)}
                          </span>
                          <small>
                            {t.kind}
                            {t.opportunity?.state === "archived"
                              ? " · arquivada"
                              : ""}
                          </small>
                        </td>
                        <td>
                          <Stars value={t.opportunity?.rating || 0} />
                        </td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() => setSelected(t.opportunityId)}
                          >
                            {t.status === "done"
                              ? "Ver registro"
                              : "Acompanhar →"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <p className="footnote">
            Carteira ativa representa potencial comercial. O total não é receita
            realizada e não muda com a busca da agenda.
          </p>
        </>
      )}
      {page === "Oportunidades" && (
        <>
          <div className="filters">
            <Field label="Situação">
              <select
                value={state}
                onChange={(e) => change(setState, e.target.value)}
              >
                <option value="">Todas</option>
                <option value="active">Ativas</option>
                <option value="archived">Arquivadas</option>
                <option value="closed">Concluídas</option>
              </select>
            </Field>
            <Field label="Etapa">
              <select
                value={stage}
                onChange={(e) => change(setStage, e.target.value)}
              >
                <option value="">Todas as etapas</option>
                {STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Canal">
              <select
                value={channel}
                onChange={(e) => change(setChannel, e.target.value)}
              >
                <option value="">Todos</option>
                {boot.settings.channels.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Grupo de serviços">
              <select
                value={group}
                onChange={(e) => change(setGroup, e.target.value)}
              >
                <option value="">Todos</option>
                {boot.settings.serviceGroups.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Criada desde">
              <input
                type="date"
                value={from}
                onChange={(e) => change(setFrom, e.target.value)}
              />
            </Field>
            <Field label="Até">
              <input
                type="date"
                value={to}
                onChange={(e) => change(setTo, e.target.value)}
              />
            </Field>
          </div>
          <div className="section-title">
            <strong>{result.total} oportunidades</strong>
            <div className="segmented">
              {["Kanban", "Lista"].map((v) => (
                <button
                  key={v}
                  className={view === v ? "active" : ""}
                  onClick={() => setView(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          {!loading &&
            !error &&
            (result.items.length ? (
              view === "Kanban" ? (
                <div className="kanban">
                  {STAGES.map((s, i) => (
                    <section className="kanban-column" key={s}>
                      <h3>
                        <i
                          style={{
                            background: [
                              "#8395a7",
                              "#8b7bc8",
                              "#3e92d1",
                              "#dfa453",
                              "#4ca286",
                            ][i],
                          }}
                        />
                        {s}
                        <span>
                          {result.items.filter((o) => o.stage === s).length}
                        </span>
                      </h3>
                      {result.items
                        .filter((o) => o.stage === s)
                        .map((o) => (
                          <button
                            className="opportunity-card"
                            key={o.id}
                            onClick={() => setSelected(o.id)}
                          >
                            <span className="card-channel">
                              {o.channel || "Canal não informado"}
                              {o.state === "archived" ? " · Arquivada" : ""}
                            </span>
                            <h4>{o.client?.name || "Cliente"}</h4>
                            <p>{o.company?.name || "Sem empresa vinculada"}</p>
                            <strong>{money(o.valueCents)}</strong>
                            <Stars value={o.rating} />
                            <footer>
                              <span>
                                {boot.users.find((u) => u.id === o.ownerId)
                                  ?.name || "Sem vendedor"}
                              </span>
                              <span>↗</span>
                            </footer>
                          </button>
                        ))}
                    </section>
                  ))}
                </div>
              ) : (
                <section className="panel table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Empresa</th>
                        <th>Vendedor</th>
                        <th>Valor</th>
                        <th>Etapa</th>
                        <th>Avaliação</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((o) => (
                        <tr key={o.id}>
                          <td>{o.client?.name}</td>
                          <td>{o.company?.name || "—"}</td>
                          <td>
                            {boot.users.find((u) => u.id === o.ownerId)?.name ||
                              "A distribuir"}
                          </td>
                          <td>{money(o.valueCents)}</td>
                          <td>
                            {o.stage}
                            <small>{o.outcome}</small>
                          </td>
                          <td>
                            <Stars value={o.rating} />
                          </td>
                          <td>
                            <button onClick={() => setSelected(o.id)}>
                              Abrir →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )
            ) : (
              <Empty>
                Nenhuma oportunidade encontrada. Ajuste os filtros ou crie uma
                nova.
              </Empty>
            ))}
          <div className="pagination">
            <button
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - 30))}
            >
              ← Anterior
            </button>
            <span>
              Página {Math.floor(offset / 30) + 1} · até 30 oportunidades por
              página
            </span>
            <button
              disabled={result.nextOffset === null || loading}
              onClick={() => setOffset(result.nextOffset || 0)}
            >
              Próxima →
            </button>
          </div>
        </>
      )}
      {creating && (
        <NewOpportunity
          boot={boot}
          clients={clients}
          companies={companies}
          close={() => setCreating(false)}
          saved={(key) => {
            setCreating(false);
            refresh();
            setSelected(key);
          }}
        />
      )}
      {selected && (
        <OpportunityDetail
          id={selected}
          boot={boot}
          clients={clients}
          companies={companies}
          close={() => {
            setSelected("");
            refresh();
          }}
          changed={refresh}
        />
      )}
    </section>
  );
}
