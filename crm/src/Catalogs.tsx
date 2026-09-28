import { useEffect, useState } from "react";
import { all, api, displayDate, money } from "./services/crmApi";
import type { Bootstrap, Client, Company, Page, Row } from "./services/crmApi";
import { AsyncForm, Empty, Field, Modal, str } from "./components";
import { CompanySelect } from "./CompanySelect";

type RecordRow = Client | Company;

export function Catalogs({
  kind,
  boot,
}: {
  kind: "clients" | "companies";
  boot: Bootstrap;
}) {
  const [rows, setRows] = useState<RecordRow[]>([]),
    [companies, setCompanies] = useState<Company[]>([]),
    [clients, setClients] = useState<Client[]>([]),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState<RecordRow | null>(null),
    [error, setError] = useState(""),
    [view, setView] = useState<RecordRow | null>(null),
    [related, setRelated] = useState<Row[]>([]),
    [page, setPage] = useState(0);
  const canEdit = ["admin", "coordenacao", "recepcao", "vendedor"].includes(
    boot.actor.role,
  );
  const isAdmin = boot.actor.role === "admin";
  async function load() {
    const [records, companyRows, clientRows] = await Promise.all([
      all<RecordRow>(`/${kind}`),
      all<Company>("/companies"),
      all<Client>("/clients"),
    ]);
    setRows(records);
    setCompanies(companyRows);
    setClients(clientRows);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [kind]);
  useEffect(() => {
    let current = true;
    setRelated([]);
    if (view) {
      const ids =
        kind === "clients"
          ? [view.id]
          : clients
              .filter((client) => client.companyId === view.id)
              .map((client) => client.id);
      Promise.all(
        ids.map(async (clientId) => {
          const result: Row[] = [];
          let offset: number | null = 0;
          while (offset !== null) {
            const response: Page<Row> = await api<Page<Row>>(
              `/opportunities?clientId=${clientId}&limit=100&offset=${offset}`,
            );
            result.push(...response.items);
            offset = response.nextOffset;
          }
          return result;
        }),
      )
        .then((result) => {
          if (current) setRelated(result.flat());
        })
        .catch((e) => {
          if (current) setError(e.message);
        });
    }
    return () => {
      current = false;
    };
  }, [view, kind, clients]);
  const filtered = rows.filter((row) =>
    `${row.name} ${"email" in row ? row.email : ""} ${"phone" in row ? row.phone : ""} ${"cnpj" in row ? row.cnpj : ""} ${"companyId" in row ? companies.find((company) => company.id === row.companyId)?.name : ""}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  const emptyRecord =
    kind === "companies"
      ? {
          id: crypto.randomUUID(),
          name: "",
          cnpj: "",
          active: true,
          createdAt: "",
        }
      : {
          id: crypto.randomUUID(),
          name: "",
          phone: "",
          email: "",
          companyId: "",
          active: true,
          createdAt: "",
        };
  async function deleteRecord(row: RecordRow) {
    const label = kind === "clients" ? "cliente" : "empresa";
    if (!window.confirm(`Excluir este ${label}? Se houver vínculos, ele será apenas inativado.`)) return;
    try {
      await api(`/${kind}/${row.id}`, "DELETE");
      if (view?.id === row.id) setView(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Não foi possível excluir o ${label}.`);
    }
  }
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">RELACIONAMENTOS</p>
          <h1>
            {kind === "clients"
              ? "Pessoas por trás de cada oportunidade."
              : "Empresas conectadas à sua carteira."}
          </h1>
          <p>
            {kind === "clients"
              ? "Cadastre contatos e vincule-os a uma empresa quando necessário."
              : "Uma empresa pode reunir vários clientes e oportunidades."}
          </p>
        </div>
        {canEdit && (
          <button
            className="primary"
            onClick={() => setEditing(emptyRecord as RecordRow)}
          >
            ＋ {kind === "clients" ? "Novo cliente" : "Nova empresa"}
          </button>
        )}
      </div>
      <div className="toolbar">
        <Field label="Buscar">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Nome, empresa, CNPJ ou contato…"
          />
        </Field>
        <span>{filtered.length} cadastros</span>
      </div>
      {error && <p className="error">{error}</p>}
      <section className="panel table-scroll">
        {!filtered.length ? (
          <Empty>Nenhum cadastro encontrado.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                {kind === "companies" ? (
                  <th>CNPJ</th>
                ) : (
                  <>
                    <th>Empresa</th>
                    <th>Contato</th>
                  </>
                )}
                <th>Situação</th>
                <th>Cadastro</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.slice(page * 30, page * 30 + 30).map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  {"cnpj" in row && <td>{formatCnpj(row.cnpj)}</td>}
                  {"phone" in row && (
                    <>
                      <td>
                        {companies.find(
                          (company) => company.id === row.companyId,
                        )?.name || "—"}
                      </td>
                      <td>
                        {row.phone}
                        <small>{row.email}</small>
                      </td>
                    </>
                  )}
                  <td>{row.active ? "Ativo" : "Inativo"}</td>
                  <td>{displayDate(row.createdAt)}</td>
                  <td>
                    <button onClick={() => setView(row)}>Vínculos</button>
                    {canEdit && (
                      <button onClick={() => setEditing(row)}>Editar</button>
                    )}
                    {isAdmin && (
                      <button className="danger-button" onClick={() => void deleteRecord(row)}>
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <div className="pagination">
        <button
          disabled={page === 0}
          onClick={() => setPage((current) => current - 1)}
        >
          Anterior
        </button>
        <span>Página {page + 1}</span>
        <button
          disabled={(page + 1) * 30 >= filtered.length}
          onClick={() => setPage((current) => current + 1)}
        >
          Próxima
        </button>
      </div>
      {editing && (
        <CatalogForm
          kind={kind}
          record={editing}
          companies={companies}
          close={() => setEditing(null)}
          saved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
      {view && (
        <Modal title={`Vínculos de ${view.name}`} close={() => setView(null)}>
          {!related.length ? (
            <Empty>Nenhuma oportunidade vinculada.</Empty>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Etapa</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {related.map((row) => (
                    <tr key={row.id}>
                      <td>{row.client?.name}</td>
                      <td>{row.stage}</td>
                      <td>{money(row.valueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </section>
  );
}

function CatalogForm({
  kind,
  record,
  companies,
  close,
  saved,
}: {
  kind: "clients" | "companies";
  record: RecordRow;
  companies: Company[];
  close: () => void;
  saved: () => Promise<void>;
}) {
  return (
    <Modal
      title={kind === "clients" ? "Cadastro de cliente" : "Cadastro de empresa"}
      close={close}
    >
      <AsyncForm
        label="Salvar cadastro"
        save={async (form) => {
          const payload =
            kind === "companies"
              ? {
                  name: str(form, "name"),
                  cnpj: str(form, "cnpj"),
                  active: form.get("active") === "on",
                  updatedAt: record.updatedAt,
                }
              : {
                  name: str(form, "name"),
                  phone: str(form, "phone"),
                  email: str(form, "email"),
                  companyId: str(form, "companyId"),
                  active: form.get("active") === "on",
                  updatedAt: record.updatedAt,
                };
          await api(`/${kind}/${record.id}`, "PUT", payload);
          await saved();
        }}
      >
        <Field label="Nome">
          <input
            name="name"
            required
            maxLength={180}
            defaultValue={record.name}
          />
        </Field>
        {kind === "companies" ? (
          <Field label="CNPJ">
            <input
              name="cnpj"
              required
              maxLength={18}
              placeholder="00.000.000/0000-00"
              defaultValue={"cnpj" in record ? record.cnpj : ""}
            />
          </Field>
        ) : (
          <>
            <CompanySelect
              companies={companies}
              defaultValue={"companyId" in record ? record.companyId : ""}
            />
            <Field label="Telefone">
              <input
                name="phone"
                defaultValue={"phone" in record ? record.phone : ""}
              />
            </Field>
            <Field label="E-mail">
              <input
                name="email"
                type="email"
                defaultValue={"email" in record ? record.email : ""}
              />
            </Field>
          </>
        )}
        <label>
          <input name="active" type="checkbox" defaultChecked={record.active} />{" "}
          Ativo
        </label>
      </AsyncForm>
    </Modal>
  );
}

function formatCnpj(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 14
    ? digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
    : value || "—";
}
