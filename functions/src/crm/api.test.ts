import request from 'supertest';
import type { RequestHandler } from 'express';
// In-memory transactional adapter: API integration tests never access production.
const mockData = new Map<string, Record<string, unknown>>();
let mockSequence = 0;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
class MockDoc {
    constructor(public path: string) { }
    get id() { return this.path.split('/').pop()!; }
    collection(name: string) { return new MockQuery(`${this.path}/${name}`); }
    async get() { const value = mockData.get(this.path); return { id: this.id, ref: this, exists: !!value, data: () => value ? clone(value) : undefined }; }
    async set(data: Record<string, unknown>) { mockData.set(this.path, clone(data)); }
    async delete() { mockData.delete(this.path); }
}
class MockQuery {
    filters: [
        string,
        unknown
    ][] = [];
    maximum = Infinity;
    cursor = '';
    sort = '';
    constructor(public path: string) { }
    doc(id = `history${++mockSequence}`) { return new MockDoc(`${this.path}/${id}`); }
    where(key: string, _op: string, value: unknown) { this.filters.push([key, value]); return this; }
    orderBy(key: string) { this.sort = key; return this; }
    limit(n: number) { this.maximum = n; return this; }
    startAfter(doc: {
        id: string;
    }) { this.cursor = doc.id; return this; }
    async get() { const docs = []; for (const [key, value] of [...mockData.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        if (!key.startsWith(this.path + '/') || key.split('/').length !== this.path.split('/').length + 1)
            continue;
        const ref = new MockDoc(key);
        if (ref.id <= this.cursor || !this.filters.every(([k, v]) => value[k] === v))
            continue;
        docs.push(await ref.get());
        if (docs.length >= this.maximum)
            break;
    } return { docs, size: docs.length, empty: !docs.length }; }
}
const mockDb = { collection: (name: string) => new MockQuery(name), getAll: (...refs: MockDoc[]) => Promise.all(refs.map(r => r.get())), batch: () => ({ refs: [] as MockDoc[], delete(ref: MockDoc) { this.refs.push(ref); return this; }, async commit() { for (const ref of this.refs) mockData.delete(ref.path); } }), runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        const pending: {
            ref: MockDoc;
            data: Record<string, unknown>;
        }[] = [];
        const tx = { get: (ref: MockDoc | MockQuery) => ref.get(), set: (ref: MockDoc, data: Record<string, unknown>) => pending.push({ ref, data }), create: (ref: MockDoc, data: Record<string, unknown>) => pending.push({ ref, data }) };
        const value = await fn(tx);
        for (const p of pending)
            await p.ref.set(p.data);
        return value;
    } };
jest.mock('firebase-admin', () => ({ firestore: Object.assign(() => mockDb, { FieldPath: { documentId: () => '__name__' } }) }));
import { createCrmApp, runArchiveSweep } from './api';
const authentication: RequestHandler = (req, _res, next) => { (req as unknown as {
    user: unknown;
}).user = { uid: req.headers['x-test-user'] || 'seller', displayName: 'Ana', setor: 'COMERCIAL' }; next(); };
const app = createCrmApp(authentication);
beforeEach(() => { mockData.clear(); mockSequence = 0; mockData.set('usuarios/seller', { displayName: 'Ana', setor: 'COMERCIAL', statusConta: true }); mockData.set('usuarios/other', { displayName: 'Bia', setor: 'COMERCIAL', statusConta: true }); mockData.set('crmAcessos/seller', { role: 'vendedor', enabled: true }); mockData.set('crmClientes/client', { id: 'client', name: 'Cliente', phone: '11999999999', email: '', companyId: '', active: true, createdAt: '2026-01-01T00:00:00Z' }); });
async function create() { return request(app).post('/opportunities').send({ id: 'op', clientId: 'client', valueCents: 150000 }); }
describe('CRM HTTP API', () => {
    test('compartilha usuários existentes sem expor seus campos internos', async () => { mockData.set('usuarios/seller', { displayName: 'Ana', setor: 'COMERCIAL', statusConta: true, internalSecret: 'not-exposed' }); const r = await request(app).get('/bootstrap'); expect(r.status).toBe(200); expect(r.body.actor.role).toBe('vendedor'); expect(r.text).not.toContain('not-exposed'); });
    test('setor legado não concede poder administrativo no CRM', async () => { mockData.set('usuarios/other', { displayName: 'Bia', setor: 'SUPORTE' }); const r = await request(app).get('/bootstrap').set('x-test-user', 'other'); expect(r.body.actor.role).toBe('leitura'); });
    test('acesso ao CRM desabilitado é negado', async () => { mockData.set('crmAcessos/seller', { role: 'vendedor', enabled: false }); expect((await request(app).get('/bootstrap')).status).toBe(403); });
    test('criação é idempotente e registra data pelo servidor', async () => { const r = await create(); expect(r.status).toBe(201); const first = r.body.createdAt; await create(); expect(mockData.get('crmOportunidades/op')?.createdAt).toBe(first); expect([...mockData.keys()].filter(k => k.includes('/history/'))).toHaveLength(1); });
    test('cliente precisa existir antes da oportunidade', async () => { const r = await request(app).post('/opportunities').send({ id: 'op', clientId: 'missing' }); expect(r.status).toBe(400); });
    test('contato é obrigatório no cadastro', async () => { expect((await request(app).put('/clients/new').send({ name: 'Cliente' })).status).toBe(400); });
    test('empresa precisa existir para vínculo', async () => { expect((await request(app).put('/clients/new').send({ name: 'Cliente', phone: '11999999999', companyId: 'missing' })).status).toBe(400); });
    test('empresa exige CNPJ válido e armazena somente dígitos', async () => { expect((await request(app).put('/companies/company').send({ name: 'Empresa', cnpj: '123' })).status).toBe(400); const r = await request(app).put('/companies/company').send({ name: 'Empresa', cnpj: '12.345.678/0001-90' }); expect(r.status).toBe(200); expect(mockData.get('crmEmpresas/company')?.cnpj).toBe('12345678000190'); });
    test('administrador exclui cadastros sem vínculos', async () => { mockData.set('crmAcessos/seller', { role: 'admin', enabled: true }); mockData.set('crmEmpresas/company', { name: 'Empresa', cnpj: '12345678000190' }); expect((await request(app).delete('/companies/company')).status).toBe(200); expect(mockData.has('crmEmpresas/company')).toBe(false); expect((await request(app).delete('/clients/client')).status).toBe(200); expect(mockData.has('crmClientes/client')).toBe(false); });
    test('inativa cliente ou empresa com vínculos', async () => { mockData.set('crmAcessos/seller', { role: 'admin', enabled: true }); mockData.set('crmEmpresas/company', { name: 'Empresa', cnpj: '12345678000190', active: true }); mockData.set('crmClientes/client', { id: 'client', name: 'Cliente', companyId: 'company', active: true }); const companyResponse = await request(app).delete('/companies/company'); expect(companyResponse.status).toBe(200); expect(companyResponse.body.inactivated).toBe(true); expect(mockData.get('crmEmpresas/company')?.active).toBe(false); await create(); const clientResponse = await request(app).delete('/clients/client'); expect(clientResponse.status).toBe(200); expect(clientResponse.body.inactivated).toBe(true); expect(mockData.get('crmClientes/client')?.active).toBe(false); });
    test('não administrador não pode excluir cliente ou empresa', async () => { mockData.set('crmEmpresas/company', { name: 'Empresa', cnpj: '12345678000190' }); expect((await request(app).delete('/companies/company')).status).toBe(403); expect((await request(app).delete('/clients/client')).status).toBe(403); });
    test('vendedor não altera oportunidade de colega', async () => { await create(); mockData.set('crmAcessos/other', { role: 'vendedor', enabled: true }); const r = await request(app).post('/opportunities/op/actions').set('x-test-user', 'other').send({ action: 'edit', version: 0, notes: 'tentativa' }); expect(r.status).toBe(403); expect(mockData.get('crmOportunidades/op')?.notes).toBe(''); });
    test('leitura compartilhada permite consultar oportunidade alheia', async () => { await create(); const r = await request(app).get('/opportunities').set('x-test-user', 'other'); expect(r.status).toBe(200); expect(r.body.items).toHaveLength(1); expect(r.body.items[0].canEdit).toBe(false); });
    test('valor da carteira não é multiplicado por tarefas', async () => { await create(); for (const n of [1, 3, 7])
        mockData.set(`crmTarefas/t${n}`, { id: `t${n}`, opportunityId: 'op', ownerId: 'seller', kind: `D+${n}`, status: 'pending', dueDate: '2026-10-01', reschedules: [] }); const r = await request(app).get('/day'); expect(r.body.metrics.portfolio).toBe(150000); expect(r.body.metrics.activeCount).toBe(1); });
    test('dados inválidos não deixam gravação parcial', async () => { await create(); const r = await request(app).post('/opportunities/op/actions').send({ action: 'edit', version: 0, ownerId: 'missing', notes: 'não gravar' }); expect(r.status).toBe(400); expect(mockData.get('crmOportunidades/op')?.notes).toBe(''); });
    test('conflito de versão retorna 409', async () => { await create(); const r = await request(app).post('/opportunities/op/actions').send({ action: 'edit', version: 99, notes: 'não gravar' }); expect(r.status).toBe(409); });
    test('vendedor não altera parâmetros administrativos', async () => { expect((await request(app).put('/settings').send({})).status).toBe(403); });
    test('administrador gerencia outro acesso sem alterar o próprio perfil', async () => { mockData.set('crmAcessos/seller', { role: 'admin', enabled: true }); const updated = await request(app).put('/access/other').send({ role: 'recepcao', enabled: true }); expect(updated.status).toBe(200); expect(mockData.get('crmAcessos/other')?.role).toBe('recepcao'); const self = await request(app).put('/access/seller').send({ role: 'leitura', enabled: true }); expect(self.status).toBe(403); });
    test('administrador exclui oportunidade de qualquer usuário', async () => { await create(); mockData.set('crmAcessos/seller', { role: 'admin', enabled: true }); mockData.set('crmTarefas/task', { opportunityId: 'op' }); const response = await request(app).delete('/opportunities/op'); expect(response.status).toBe(200); expect(mockData.has('crmOportunidades/op')).toBe(false); expect(mockData.has('crmTarefas/task')).toBe(false); });
    test('perfil não administrador não exclui oportunidade', async () => { await create(); const response = await request(app).delete('/opportunities/op'); expect(response.status).toBe(403); expect(mockData.has('crmOportunidades/op')).toBe(true); });
    test('rotina agendada não arquiva apenas pelo vencimento', async () => { await create(); const o = mockData.get('crmOportunidades/op')!; mockData.set('crmOportunidades/op', { ...o, sentDate: '2026-09-01', archiveDate: '2026-09-13', cycle: 1 }); mockData.set('crmTarefas/t', { id: 't', opportunityId: 'op', cycle: 1, status: 'pending', kind: 'D+7', dueDate: '2026-09-10' }); await runArchiveSweep('2026-10-20T15:00:00Z'); expect(mockData.get('crmOportunidades/op')?.state).toBe('active'); });
    test('rotina arquiva e cria apenas uma retomada em execuções repetidas', async () => { await create(); const o = mockData.get('crmOportunidades/op')!; mockData.set('crmOportunidades/op', { ...o, sentDate: '2026-09-01', archiveDate: '2026-09-13', cycle: 1 }); mockData.set('crmTarefas/final', { id: 'final', opportunityId: 'op', cycle: 1, status: 'done', kind: 'D+7', result: 'Sem resposta', finalFollowUp: true, completedDate: '2026-09-10' }); expect(await runArchiveSweep('2026-09-13T15:00:00Z')).toBe(1); expect(await runArchiveSweep('2026-09-14T15:00:00Z')).toBe(0); expect(mockData.get('crmOportunidades/op')?.state).toBe('archived'); const retakes = [...mockData.values()].filter(t => t.kind === 'Retomada'); expect(retakes).toHaveLength(1); expect(retakes[0].dueDate).toBe('2026-10-01'); });
    test('importa grupos sem modificar a base existente', async () => { mockData.set('crmAcessos/seller', { role: 'admin', enabled: true }); mockData.set('servicosStatus/PLOTAGEM', { tipo: 'PLOTAGEM', statusSequence: ['Iniciado', 'Concluído'] }); const r = await request(app).post('/settings/import-services').send({}); expect(r.status).toBe(200); expect(r.body.serviceGroups).toContain('Plotagem'); expect(mockData.get('servicosStatus/PLOTAGEM')).toEqual({ tipo: 'PLOTAGEM', statusSequence: ['Iniciado', 'Concluído'] }); });
    test('perfil somente consulta não pode ser vendedor responsável', async () => { const r = await request(app).post('/opportunities').send({ id: 'op', clientId: 'client', ownerId: 'other' }); expect(r.status).toBe(400); expect(mockData.has('crmOportunidades/op')).toBe(false); });
});
