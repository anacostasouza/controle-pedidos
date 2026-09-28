import express, { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { FieldPath } from 'firebase-admin/firestore';
import { authMiddleware } from '../utils/authMiddleware';
import { applyStandardCors, applySecurityHeaders, createDefaultRateLimiter } from '../utils/httpMiddleware';
import { Actor, Client, Company, CrmError, DEFAULT_SETTINGS, SERVICE_LABELS, Opportunity, Role, Settings, Task, applyCommand, archiveOpportunity, canEdit, ensure, newOpportunity, patchOpportunity, text, today, validateSettings } from './domain';
export const COLLECTIONS = { opportunities: 'crmOportunidades', tasks: 'crmTarefas', clients: 'crmClientes', companies: 'crmEmpresas', settings: 'crmConfiguracoes', access: 'crmAcessos' };
const db = () => admin.firestore();
const CRM_QUERY_WARN_MS = Number(process.env.CRM_QUERY_WARN_MS || 1000);
const CRM_READ_WARN_DOCUMENTS = Number(process.env.CRM_READ_WARN_DOCUMENTS || 1000);
type AuthRequest = Request & {
    user: {
        uid: string;
        displayName?: string;
        setor?: string;
    };
    actor: Actor;
};
type Handler = (req: AuthRequest, res: Response) => Promise<unknown>;
const route = (handler: Handler): express.RequestHandler => (req, res, next) => { Promise.resolve(handler(req as AuthRequest, res)).catch(next); };
function id(value: unknown): string { const v = text(value, 'Identificador', 160, true); ensure(/^[a-zA-Z0-9_-]+$/.test(v), 'Identificador inválido.'); return v; }
export async function scan<T>(collection: string, field?: string, value?: string, extraFilters: [string, unknown][] = []): Promise<T[]> {
    const startedAt = Date.now();
    let query: FirebaseFirestore.Query = db().collection(collection);
    if (field)
        query = query.where(field, '==', value);
    for (const [filterField, filterValue] of extraFilters)
        query = query.where(filterField, '==', filterValue);
    query = query.orderBy(FieldPath.documentId());
    const result: T[] = [];
    let pages = 0;
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (;;) {
        const page = await (cursor ? query.startAfter(cursor) : query).limit(400).get();
        pages++;
        result.push(...page.docs.map(d => ({ ...d.data(), id: d.id }) as T));
        if (page.size < 400)
            break;
        cursor = page.docs[page.size - 1];
    }
    const durationMs = Date.now() - startedAt;
    const metadata = {
        collection,
        field: field || null,
        pages,
        documentsRead: result.length,
        durationMs,
    };
    console.info('[CRM_QUERY]', metadata);
    if (durationMs >= CRM_QUERY_WARN_MS || result.length >= CRM_READ_WARN_DOCUMENTS) {
        console.warn('[CRM_QUERY_SLOW_OR_BROAD]', metadata);
    }
    return result;
}

function equalityFilters(req: Request): [string, unknown][] {
    return (['state', 'stage', 'channel', 'serviceGroup'] as const)
        .filter(field => typeof req.query[field] === 'string' && String(req.query[field]).length > 0)
        .map(field => [field, String(req.query[field])] as [string, unknown]);
}
async function settings(): Promise<Settings> { const doc = await db().collection(COLLECTIONS.settings).doc('general').get(); return doc.exists ? doc.data() as Settings : DEFAULT_SETTINGS; }
async function loadRelatedCatalogs(opportunities: Opportunity[]): Promise<{ clients: Client[]; companies: Company[] }> {
    const clientIds = [...new Set(opportunities.map(opportunity => opportunity.clientId).filter(Boolean))];
    const clientRefs = clientIds.map(clientId => db().collection(COLLECTIONS.clients).doc(clientId));
    const clients = clientRefs.length ? await db().getAll(...clientRefs) : [];
    const clientRows = clients.filter(snapshot => snapshot.exists).map(snapshot => ({ ...snapshot.data(), id: snapshot.id }) as Client);
    const companyIds = [...new Set(clientRows.map(client => client.companyId).filter(Boolean))];
    const companyRefs = companyIds.map(companyId => db().collection(COLLECTIONS.companies).doc(companyId));
    const companies = companyRefs.length ? await db().getAll(...companyRefs) : [];
    return {
        clients: clientRows,
        companies: companies.filter(snapshot => snapshot.exists).map(snapshot => ({ ...snapshot.data(), id: snapshot.id }) as Company),
    };
}
function writeAccess(a: Actor) { ensure(['admin', 'coordenacao', 'recepcao', 'vendedor'].includes(a.role), 'Sem permissão para editar cadastros.', 403); }
function adminAccess(a: Actor) { ensure(a.role === 'admin', 'Apenas administradores podem configurar o CRM.', 403); }
const normalized = (s: unknown) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function createCrmApp(authentication: express.RequestHandler = authMiddleware) {
    const app = express();
    applyStandardCors(app);
    applySecurityHeaders(app);
    app.use(createDefaultRateLimiter());
    app.use(express.json({ limit: '100kb' }));
    app.use((req, res, next) => {
        const startedAt = Date.now();
        res.on('finish', () => {
            console.info('[CRM_REQUEST]', {
                method: req.method,
                route: req.route?.path || req.path,
                status: res.statusCode,
                durationMs: Date.now() - startedAt,
            });
        });
        next();
    });
    app.use(authentication);
    app.use((req: Request, _res: Response, next: NextFunction) => {
        const r = req as AuthRequest;
        db().collection(COLLECTIONS.access).doc(r.user.uid).get().then(access => {
            ensure(access.data()?.enabled !== false, 'Acesso ao CRM desativado.', 403);
            r.actor = { uid: r.user.uid, name: r.user.displayName || 'Usuário', role: access.exists ? access.data()!.role as Role : 'leitura' };
            next();
        }).catch(next);
    });
    app.get('/bootstrap', route(async (req, res) => {
        const [users, access, config] = await Promise.all([scan<Record<string, unknown>>('usuarios'), scan<Record<string, unknown>>(COLLECTIONS.access), settings()]);
        res.json({ actor: req.actor, settings: config, users: users.map(u => {
                const permission = access.find(a => a.id === u.id);
                return { id: u.id, name: u.displayName || 'Usuário', sector: u.setor || '', active: u.statusConta !== false && permission?.enabled !== false, role: permission?.role || 'leitura' };
            }) });
    }));
    for (const kind of ['clients', 'companies'] as const) {
        app.get(`/${kind}`, route(async (req, res) => {
            const all = await scan<Client | Company>(COLLECTIONS[kind]);
            const q = normalized(req.query.q);
            const rows = all.filter(row => (!q || normalized(row.name).includes(q)) && (req.query.active !== 'true' || row.active));
            const offset = Math.max(0, Number(req.query.offset) || 0), limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
            res.json({ items: rows.slice(offset, offset + limit), total: rows.length, nextOffset: offset + limit < rows.length ? offset + limit : null });
        }));
        app.put(`/${kind}/:id`, route(async (req, res) => {
            writeAccess(req.actor);
            const key = id(req.params.id), raw = req.body;
            const data: Record<string, unknown> = { name: text(raw.name, 'Nome', 180, true), active: raw.active !== false, updatedAt: new Date().toISOString() };
            if (kind === 'companies') {
                const cnpj = String(raw.cnpj || '').replace(/\D/g, '');
                ensure(cnpj.length === 14, 'CNPJ deve conter 14 dígitos.');
                data.cnpj = cnpj;
            }
            if (kind === 'clients') {
                data.phone = text(raw.phone || '', 'Telefone', 40);
                data.email = text(raw.email || '', 'E-mail', 180);
                data.companyId = raw.companyId ? id(raw.companyId) : '';
                ensure(data.phone || data.email, 'Preencha telefone ou e-mail.');
                ensure(!data.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email)), 'E-mail inválido.');
                ensure(!data.phone || String(data.phone).replace(/\D/g, '').length >= 8, 'Telefone inválido.');
            }
            const ref = db().collection(COLLECTIONS[kind]).doc(key);
            await db().runTransaction(async (tx) => {
                const existing = await tx.get(ref);
                if (data.companyId) {
                    const company = await tx.get(db().collection(COLLECTIONS.companies).doc(String(data.companyId)));
                    ensure(company.exists && (company.data()?.active || existing.data()?.companyId === data.companyId), 'Empresa não está ativa.');
                }
                if (existing.exists)
                    ensure(raw.updatedAt === existing.data()?.updatedAt, 'Cadastro alterado por outro usuário. Atualize a tela.', 409);
                tx.set(ref, { ...data, id: key, createdAt: existing.data()?.createdAt || data.updatedAt, createdBy: existing.data()?.createdBy || req.actor.uid });
            });
            res.json({ id: key });
        }));
        app.delete(`/${kind}/:id`, route(async (req, res) => {
            adminAccess(req.actor);
            const key = id(req.params.id);
            const ref = db().collection(COLLECTIONS[kind]).doc(key);
            const record = await ref.get();
            ensure(record.exists, `${kind === 'clients' ? 'Cliente' : 'Empresa'} não encontrado.`, 404);
            if (kind === 'clients') {
                const opportunities = await db().collection(COLLECTIONS.opportunities).where('clientId', '==', key).limit(1).get();
                if (!opportunities.empty) {
                    await ref.set({ ...record.data(), active: false, updatedAt: new Date().toISOString() });
                    res.json({ ok: true, inactivated: true });
                    return;
                }
            } else {
                const clients = await db().collection(COLLECTIONS.clients).where('companyId', '==', key).limit(1).get();
                if (!clients.empty) {
                    await ref.set({ ...record.data(), active: false, updatedAt: new Date().toISOString() });
                    res.json({ ok: true, inactivated: true });
                    return;
                }
            }
            await ref.delete();
            res.json({ ok: true });
        }));
    }
    app.get('/opportunities', route(async (req, res) => {
        const ownerField = req.query.ownerId ? 'ownerId' : undefined;
        const ownerValue = req.query.ownerId ? String(req.query.ownerId) : undefined;
        const filters = equalityFilters(req);
        let opps: Opportunity[];
        try {
            opps = await scan<Opportunity>(COLLECTIONS.opportunities, ownerField, ownerValue, filters);
        } catch (error) {
            console.warn('[CRM_QUERY_INDEX_FALLBACK]', { collection: COLLECTIONS.opportunities, filters: filters.map(([field]) => field), reason: error instanceof Error ? error.message : 'unknown' });
            opps = await scan<Opportunity>(COLLECTIONS.opportunities, ownerField, ownerValue);
        }
        const { clients, companies } = await loadRelatedCatalogs(opps);
        const clientMap = new Map(clients.map(c => [c.id, c])), companyMap = new Map(companies.map(c => [c.id, c]));
        const rows = opps.map(o => { const c = clientMap.get(o.clientId); return { ...o, client: c, company: companyMap.get(c?.companyId || ''), canEdit: canEdit(req.actor, o) }; }).filter(o => {
            const q = normalized(req.query.q);
            return (!q || normalized(`${o.client?.name} ${o.client?.phone} ${o.client?.email} ${o.company?.name}`).includes(q)) && (!req.query.state || o.state === req.query.state) && (!req.query.stage || o.stage === req.query.stage) && (!req.query.channel || o.channel === req.query.channel) && (!req.query.serviceGroup || o.serviceGroup === req.query.serviceGroup) && (!req.query.clientId || o.clientId === req.query.clientId) && (!req.query.from || o.createdAt.slice(0, 10) >= String(req.query.from)) && (!req.query.to || o.createdAt.slice(0, 10) <= String(req.query.to)) && (req.query.unassigned !== 'true' || !o.ownerId);
        }).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
        const offset = Math.max(0, Number(req.query.offset) || 0), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
        res.json({ items: rows.slice(offset, offset + limit), total: rows.length, nextOffset: offset + limit < rows.length ? offset + limit : null });
    }));
    app.post('/opportunities', route(async (req, res) => {
        const key = id(req.body.id), ref = db().collection(COLLECTIONS.opportunities).doc(key), clientId = id(req.body.clientId), now = new Date().toISOString();
        const result = await db().runTransaction(async (tx) => {
            const [existing, client, cfg] = await Promise.all([tx.get(ref), tx.get(db().collection(COLLECTIONS.clients).doc(clientId)), tx.get(db().collection(COLLECTIONS.settings).doc('general'))]);
            if (existing.exists) {
                ensure(existing.data()?.createdBy === req.actor.uid, 'Identificador já utilizado.', 409);
                return existing.data();
            }
            ensure(client.exists && client.data()?.active, 'Cliente não está ativo.');
            const o = newOpportunity(key, clientId, req.actor, now);
            patchOpportunity(o, req.body, cfg.exists ? cfg.data() as Settings : DEFAULT_SETTINGS);
            await validateReferences(tx, o);
            tx.create(ref, o);
            tx.create(ref.collection('history').doc(), { at: now, by: req.actor.uid, actorName: req.actor.name, action: 'create', version: 0 });
            return o;
        });
        res.status(201).json(result);
    }));
    app.get('/opportunities/:id', route(async (req, res) => {
        const ref = db().collection(COLLECTIONS.opportunities).doc(id(req.params.id));
        const o = await ref.get();
        ensure(o.exists, 'Oportunidade não encontrada.', 404);
        const [tasks, history] = await Promise.all([scan<Task>(COLLECTIONS.tasks, 'opportunityId', ref.id), ref.collection('history').orderBy('at', 'desc').limit(40).get()]);
        res.json({ opportunity: { ...o.data(), id: ref.id }, tasks, history: history.docs.map(d => ({ id: d.id, ...d.data() })), canEdit: canEdit(req.actor, o.data() as Opportunity) });
    }));
    app.delete('/opportunities/:id', route(async (req, res) => {
        adminAccess(req.actor);
        const key = id(req.params.id);
        const ref = db().collection(COLLECTIONS.opportunities).doc(key);
        const opportunity = await ref.get();
        ensure(opportunity.exists, 'Oportunidade não encontrada.', 404);
        const [tasks, history] = await Promise.all([
            db().collection(COLLECTIONS.tasks).where('opportunityId', '==', key).get(),
            ref.collection('history').get(),
        ]);
        const refs = [ref, ...tasks.docs.map(doc => doc.ref), ...history.docs.map(doc => doc.ref)];
        for (let offset = 0; offset < refs.length; offset += 400) {
            const batch = db().batch();
            refs.slice(offset, offset + 400).forEach(docRef => batch.delete(docRef));
            await batch.commit();
        }
        res.json({ ok: true });
    }));
    app.get('/opportunities/:id/history', route(async (req, res) => {
        let query = db().collection(COLLECTIONS.opportunities).doc(id(req.params.id)).collection('history').orderBy('at', 'desc').orderBy(FieldPath.documentId(), 'desc');
        if (req.query.cursor) {
            const cursor = await db().collection(COLLECTIONS.opportunities).doc(id(req.params.id)).collection('history').doc(id(req.query.cursor)).get();
            ensure(cursor.exists, 'Cursor inválido.');
            query = query.startAfter(cursor);
        }
        const page = await query.limit(40).get();
        res.json({ items: page.docs.map(d => ({ id: d.id, ...d.data() })), nextCursor: page.size === 40 ? page.docs[39].id : null });
    }));
    app.post('/opportunities/:id/actions', route(async (req, res) => {
        const key = id(req.params.id), action = text(req.body.action, 'Ação', 40, true), now = new Date().toISOString();
        const result = await db().runTransaction(async (tx) => {
            const ref = db().collection(COLLECTIONS.opportunities).doc(key);
            const [snap, taskSnap, cfg] = await Promise.all([tx.get(ref), tx.get(db().collection(COLLECTIONS.tasks).where('opportunityId', '==', key)), tx.get(db().collection(COLLECTIONS.settings).doc('general'))]);
            ensure(snap.exists, 'Oportunidade não encontrada.', 404);
            const previous = snap.data() as Opportunity;
            const currentTasks = taskSnap.docs.map(d => d.data() as Task);
            const result = applyCommand(previous, currentTasks, req.actor, action, req.body, cfg.exists ? cfg.data() as Settings : DEFAULT_SETTINGS, now);
            await validateReferences(tx, result.opportunity);
            if (req.body.coordinatorId) {
                const uid = id(req.body.coordinatorId);
                const [u, access] = await Promise.all([tx.get(db().collection('usuarios').doc(uid)), tx.get(db().collection(COLLECTIONS.access).doc(uid))]);
                ensure(u.exists && u.data()?.statusConta !== false && access.data()?.enabled !== false && ['admin', 'coordenacao'].includes(access.data()?.role || 'leitura'), 'Coordenador inválido.');
            }
            tx.set(ref, result.opportunity);
            for (const task of result.tasks)
                if (JSON.stringify(currentTasks.find(t => t.id === task.id)) !== JSON.stringify(task))
                    tx.set(db().collection(COLLECTIONS.tasks).doc(task.id), task);
            const changes = Object.fromEntries(Object.entries(result.opportunity).filter(([k, v]) => JSON.stringify(previous[k as keyof Opportunity]) !== JSON.stringify(v)).map(([k, v]) => [k, { from: previous[k as keyof Opportunity], to: v }]));
            tx.create(ref.collection('history').doc(), { at: now, by: req.actor.uid, actorName: req.actor.name, action, version: result.opportunity.version, changes, taskId: req.body.taskId || '', reason: typeof req.body.reason === 'string' ? req.body.reason.slice(0, 1000) : '', notes: typeof req.body.notes === 'string' ? req.body.notes.slice(0, 5000) : '' });
            return result;
        });
        res.json(result);
    }));
    app.get('/day', route(async (req, res) => {
        const owner = req.query.ownerId ? id(req.query.ownerId) : req.actor.uid, day = today();
        const [opps, tasks] = await Promise.all([scan<Opportunity>(COLLECTIONS.opportunities, 'ownerId', owner), scan<Task>(COLLECTIONS.tasks, 'ownerId', owner)]);
        // Coordinator tasks can reference an opportunity owned by another seller.
        const missingIds = [...new Set(tasks.filter(t => t.status === 'pending' && !opps.some(o => o.id === t.opportunityId)).map(t => t.opportunityId))];
        const extra = await Promise.all(missingIds.map(key => db().collection(COLLECTIONS.opportunities).doc(key).get()));
        const allOpps = [...opps, ...extra.filter(d => d.exists).map(d => d.data() as Opportunity)];
        const related = await loadRelatedCatalogs(allOpps);
        const clients = related.clients;
        const companies = related.companies;
        const active = opps.filter(o => o.state === 'active'), won = opps.filter(o => o.outcome === 'Conquistado' && o.closedAt && today(new Date(o.closedAt)).slice(0, 7) === day.slice(0, 7));
        const planned = tasks.filter(t => t.kind !== 'Coordenação' && (t.dueDate === day || t.reschedules.some(r => r.from === day && today(new Date(r.at)) === day)) && (t.status !== 'cancelled' || t.dueDate === day));
        const done = planned.filter(t => t.status === 'done' && t.completedDate === day).length;
        const sum = (rows: Opportunity[]) => rows.reduce((n, o) => n + (o.valueCents || 0), 0);
        const rows = tasks.filter(t => t.status === 'pending' || t.completedDate === day || t.reschedules.some(r => r.from === day && today(new Date(r.at)) === day)).map(t => {
            const o = allOpps.find(o => o.id === t.opportunityId), c = clients.find(c => c.id === o?.clientId);
            return { ...t, opportunity: o, client: c, company: companies.find(e => e.id === c?.companyId) };
        }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        res.json({ day, metrics: { portfolio: sum(active), activeCount: active.length, missingValue: active.filter(o => o.valueCents === null).length, wonValue: sum(won), wonCount: won.length, negotiationValue: sum(active.filter(o => o.stage === 'Em negociação')), contacts: tasks.filter(t => t.kind !== 'Coordenação' && t.status === 'done' && t.completedDate === day).length, planned: planned.length, done }, tasks: rows });
    }));
    app.put('/settings', route(async (req, res) => { adminAccess(req.actor); const config = validateSettings(req.body); const refs = config.approverIds.map(uid => db().collection('usuarios').doc(id(uid))); if (refs.length) {
        const users = await db().getAll(...refs);
        ensure(users.every(u => u.exists && u.data()?.statusConta !== false), 'Validador inválido.');
    } await db().collection(COLLECTIONS.settings).doc('general').set(config); res.json(config); }));
    app.post('/settings/import-services', route(async (req, res) => {
        adminAccess(req.actor);
        const legacy = await scan<Record<string, unknown>>('servicosStatus');
        const names = legacy.map(s => SERVICE_LABELS[String(s.tipo || s.id)] || String(s.nome || s.tipo || s.id)).filter(n => n.length > 0 && n.length <= 150);
        const ref = db().collection(COLLECTIONS.settings).doc('general');
        const config = await db().runTransaction(async (tx) => { const snap = await tx.get(ref); const current = snap.exists ? snap.data() as Settings : DEFAULT_SETTINGS; const next = validateSettings({ ...current, serviceGroups: [...new Set([...current.serviceGroups, ...names])] }); tx.set(ref, next); return next; });
        res.json(config);
    }));
    app.put('/access/:id', route(async (req, res) => { adminAccess(req.actor); const uid = id(req.params.id); ensure(['recepcao', 'vendedor', 'orcamentista', 'coordenacao', 'admin', 'leitura'].includes(req.body.role), 'Perfil inválido.'); ensure(uid !== req.actor.uid, 'Outro administrador deve alterar seu acesso.', 403); const user = await db().collection('usuarios').doc(uid).get(); ensure(user.exists, 'Usuário não encontrado.'); await db().collection(COLLECTIONS.access).doc(uid).set({ role: req.body.role, enabled: req.body.enabled !== false, by: req.actor.uid, at: new Date().toISOString() }); res.json({ ok: true }); }));
    app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { if (error instanceof CrmError) {
        res.status(error.status).json({ message: error.message });
        return;
    } console.error('CRM request failed', error instanceof Error ? error.message : 'unknown'); res.status(500).json({ message: 'Não foi possível salvar ou carregar os dados. Tente novamente.' }); });
    return app;
}
async function validateReferences(tx: FirebaseFirestore.Transaction, o: Opportunity) {
    for (const uid of [...new Set([o.ownerId, o.estimatorId].filter(Boolean))]) {
        const [u, access] = await Promise.all([tx.get(db().collection('usuarios').doc(id(uid))), tx.get(db().collection(COLLECTIONS.access).doc(id(uid)))]);
        ensure(u.exists && u.data()?.statusConta !== false && access.data()?.enabled !== false, 'Responsável não está ativo.');
        const role = access.data()?.role || 'leitura';
        if (uid === o.ownerId)
            ensure(['vendedor', 'admin', 'coordenacao'].includes(role), 'Responsável precisa ter perfil de vendedor, coordenação ou administrador no CRM.');
        if (uid === o.estimatorId)
            ensure(['orcamentista', 'admin', 'coordenacao'].includes(role), 'Orçamentista precisa ter perfil compatível no CRM.');
    }
}
export async function runArchiveSweep(now = new Date().toISOString()) {
    let count = 0;
    const errors: string[] = [];
    // Paginate candidates and recheck every condition inside a transaction.
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    const query = db().collection(COLLECTIONS.opportunities).where('state', '==', 'active').orderBy(FieldPath.documentId());
    for (;;) {
        const page = await (cursor ? query.startAfter(cursor) : query).limit(100).get();
        for (const candidate of page.docs) {
            if (!candidate.data().archiveDate || candidate.data().archiveDate > today(new Date(now)))
                continue;
            try {
                const archived = await db().runTransaction(async (tx) => {
                    const [o, tasks] = await Promise.all([tx.get(candidate.ref), tx.get(db().collection(COLLECTIONS.tasks).where('opportunityId', '==', candidate.id))]);
                    if (!o.exists)
                        return false;
                    const previousTasks = tasks.docs.map(t => t.data() as Task);
                    const result = archiveOpportunity(o.data() as Opportunity, previousTasks, now);
                    if (!result)
                        return false;
                    tx.set(candidate.ref, result.opportunity);
                    for (const task of result.tasks)
                        if (!previousTasks.some(t => t.id === task.id))
                            tx.create(db().collection(COLLECTIONS.tasks).doc(task.id), task);
                    tx.create(candidate.ref.collection('history').doc(), { at: now, by: 'system', actorName: 'Sistema', action: 'archive', version: result.opportunity.version });
                    return true;
                });
                if (archived)
                    count++;
            }
            catch (error) {
                errors.push(candidate.id);
                console.error('CRM archive failed', candidate.id, error instanceof Error ? error.message : 'unknown');
            }
        }
        if (page.size < 100)
            break;
        cursor = page.docs[page.size - 1];
    }
    if (errors.length)
        throw new Error(`Falha em ${errors.length} arquivamentos; a rotina deve tentar novamente.`);
    return count;
}
