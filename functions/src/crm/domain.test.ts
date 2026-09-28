import { Actor, DEFAULT_SETTINGS, Opportunity, Task, addDays, applyCommand, archiveDue, archiveOpportunity, businessDays, canEdit, date, newOpportunity, patchOpportunity, today, validateSettings } from './domain';
const actor: Actor = { uid: 'seller', name: 'Ana', role: 'vendedor' };
const now = '2026-09-01T15:00:00.000Z';
function fixture() { const opportunity = newOpportunity('op', 'client', actor, now); return applyCommand(opportunity, [], actor, 'send', { version: 0, sentDate: '2026-09-01' }, DEFAULT_SETTINGS, now); }
function cmd(state: {
    opportunity: Opportunity;
    tasks: Task[];
}, name: string, raw: Record<string, unknown>, at = now) { return applyCommand(state.opportunity, state.tasks, actor, name, { ...raw, version: state.opportunity.version }, DEFAULT_SETTINGS, at); }
function completeCycle() { let state = fixture(); for (const t of state.tasks) {
    state = cmd(state, 'contact', { taskId: t.id, result: 'Sem resposta', contactDate: t.dueDate }, `${t.dueDate}T15:00:00.000Z`);
} return state; }
describe('calendário comercial', () => {
    test('D+1 D+3 D+7 excluem finais de semana e feriados', () => { expect([1, 3, 7].map(n => businessDays('2026-09-04', n, ['2026-09-07']))).toEqual(['2026-09-08', '2026-09-10', '2026-09-16']); });
    test('30 dias são corridos, inclusive virada de ano', () => expect(addDays('2026-12-15', 30)).toBe('2027-01-14'));
    test('ano bissexto', () => expect(addDays('2028-02-28', 1)).toBe('2028-02-29'));
    test('data inexistente é rejeitada', () => expect(() => date('2026-02-30')).toThrow('Data inválida'));
    test('dia operacional usa São Paulo na virada UTC', () => expect(today(new Date('2026-09-02T01:00:00Z'))).toBe('2026-09-01'));
});
describe('oportunidades e acesso', () => {
    test('recepção cria oportunidade sem vendedor', () => { const o = newOpportunity('x', 'c', { uid: 'r', name: 'Recepção', role: 'recepcao' }, now); expect(o.ownerId).toBe(''); expect(o.createdAt).toBe(now); });
    test('somente dono ou perfis responsáveis editam', () => { const o = fixture().opportunity; expect(canEdit({ ...actor, uid: 'other' }, o)).toBe(false); expect(canEdit({ ...actor, uid: 'other', role: 'coordenacao' }, o)).toBe(true); expect(canEdit({ ...actor, role: 'leitura' }, o)).toBe(false); });
    test.each([-1, 6, 2.5, '5'])('rejeita avaliação %s', rating => { const o = fixture().opportunity; expect(() => patchOpportunity(o, { rating }, DEFAULT_SETTINGS)).toThrow('estrelas'); });
    test.each([0, 1, 2, 3, 4, 5])('aceita avaliação %s', rating => { const o = fixture().opportunity; patchOpportunity(o, { rating }, DEFAULT_SETTINGS); expect(o.rating).toBe(rating); });
    test('valor inválido rejeitado', () => expect(() => patchOpportunity(fixture().opportunity, { valueCents: -2 }, DEFAULT_SETTINGS)).toThrow('Valor'));
    test('alteração concorrente é rejeitada', () => { const s = fixture(); expect(() => applyCommand(s.opportunity, s.tasks, actor, 'edit', { version: 0, notes: 'x' }, DEFAULT_SETTINGS, now)).toThrow('Atualize'); });
    test('aprovação pendente ou não aprovada não bloqueia envio', () => { const o = newOpportunity('op', 'c', actor, now); o.complexity = 'complex'; o.approval = 'Não aprovada'; expect(applyCommand(o, [], actor, 'send', { version: 0, sentDate: '2026-09-01' }, DEFAULT_SETTINGS, now).tasks).toHaveLength(3); });
    test('permite registrar envio anterior à criação da oportunidade', () => { const o = newOpportunity('op', 'c', actor, '2026-09-10T15:00:00.000Z'); expect(applyCommand(o, [], actor, 'send', { version: 0, sentDate: '2026-09-01' }, DEFAULT_SETTINGS, now).opportunity.sentDate).toBe('2026-09-01'); });
    test('permite corrigir data de envio anterior à criação da oportunidade', () => { const s = fixture(); const updated = cmd(s, 'correctSentDate', { sentDate: '2026-08-20' }); expect(updated.opportunity.sentDate).toBe('2026-08-20'); });
    test('validador precisa estar configurado', () => { const s = fixture(); s.opportunity.complexity = 'complex'; expect(() => cmd(s, 'approve', { approval: 'Aprovada' })).toThrow('Validador'); });
    test('transferência atualiza tarefas pendentes', () => { const s = cmd(fixture(), 'edit', { ownerId: 'other' }); expect(s.tasks.every(t => t.ownerId === 'other')).toBe(true); });
    test('envio duplicado não cria outro ciclo', () => expect(() => cmd(fixture(), 'send', { sentDate: '2026-09-01' })).toThrow('já registrado'));
    test('reenvio explícito cancela tarefas anteriores', () => { const s = cmd(fixture(), 'send', { sentDate: '2026-09-01', newCycle: true }); expect(s.tasks.filter(t => t.status === 'pending')).toHaveLength(3); expect(s.tasks.filter(t => t.status === 'cancelled')).toHaveLength(3); expect(s.opportunity.cycle).toBe(2); });
    test('perda exige motivo e Outro exige descrição', () => { const s = fixture(); expect(() => cmd(s, 'close', { outcome: 'Perdido' })).toThrow('Motivo'); expect(() => cmd(s, 'close', { outcome: 'Perdido', lossReason: 'Outro' })).toThrow('Descreva'); });
    test('conquista cancela todas tarefas futuras', () => { const s = cmd(fixture(), 'close', { outcome: 'Conquistado' }); expect(s.opportunity.state).toBe('closed'); expect(s.tasks.every(t => t.status === 'cancelled')).toBe(true); });
});
describe('contato, reagendamento e arquivamento', () => {
    test('sem registro permanece pendente mesmo após D+30', () => { const s = fixture(); expect(archiveOpportunity(s.opportunity, s.tasks, '2026-11-01T15:00:00Z')).toBeNull(); expect(s.tasks.every(t => t.status === 'pending')).toBe(true); });
    test('arquiva apenas três dias corridos após acompanhamento final', () => { const s = completeCycle(); expect(s.opportunity.archiveDate).toBe('2026-09-13'); expect(archiveOpportunity(s.opportunity, s.tasks, '2026-09-12T15:00:00Z')).toBeNull(); const archived = archiveOpportunity(s.opportunity, s.tasks, '2026-09-13T15:00:00Z')!; expect(archived.opportunity.state).toBe('archived'); expect(archived.tasks.find(t => t.kind === 'Retomada')?.dueDate).toBe('2026-10-01'); expect(archiveOpportunity(archived.opportunity, archived.tasks, '2026-09-14T15:00:00Z')).toBeNull(); });
    test('pendência anterior impede arquivar mesmo com D+7 realizado', () => { let s = fixture(); const t = s.tasks[2]; s = cmd(s, 'contact', { taskId: t.id, result: 'Sem resposta', contactDate: t.dueDate }, '2026-09-10T15:00:00Z'); expect(archiveDue(s.opportunity, s.tasks)).toBeNull(); });
    test('reagendamento conserva tarefa e vencimento original', () => { const s = fixture(), t = s.tasks[2]; const updated = cmd(s, 'reschedule', { taskId: t.id, dueDate: '2026-09-20', reason: 'Cliente solicitou' }); expect(updated.tasks).toHaveLength(3); expect(updated.tasks[2].originalDueDate).toBe('2026-09-10'); expect(updated.tasks[2].dueDate).toBe('2026-09-20'); expect(updated.tasks[2].status).toBe('pending'); expect(updated.tasks[2].reschedules).toHaveLength(1); });
    test('prazo de arquivamento parte do contato realizado, não da data reagendada', () => { let s = fixture(); for (const t of s.tasks.slice(0, 2))
        s = cmd(s, 'contact', { taskId: t.id, result: 'Sem resposta', contactDate: t.dueDate }, `${t.dueDate}T15:00:00Z`); s = cmd(s, 'reschedule', { taskId: s.tasks[2].id, dueDate: '2026-09-20', reason: 'Retorno combinado' }); s = cmd(s, 'contact', { taskId: s.tasks[2].id, result: 'Sem resposta', contactDate: '2026-09-22' }, '2026-09-22T15:00:00Z'); expect(s.opportunity.archiveDate).toBe('2026-09-25'); });
    test('novo follow-up suspende arquivamento e reinicia contagem', () => { let s = completeCycle(); s = cmd(s, 'next', { dueDate: '2026-09-17' }, '2026-09-11T15:00:00Z'); expect(s.opportunity.archiveDate).toBeNull(); s = cmd(s, 'contact', { taskId: s.tasks[3].id, result: 'Sem resposta', contactDate: '2026-09-17' }, '2026-09-17T15:00:00Z'); expect(s.opportunity.archiveDate).toBe('2026-09-20'); });
    test('novo follow-up cancela pendências anteriores', () => { const s = cmd(fixture(), 'next', { dueDate: '2026-09-20' }); expect(s.tasks.filter(t => t.status === 'pending')).toHaveLength(1); expect(s.tasks.slice(0, 3).every(t => t.status === 'cancelled')).toBe(true); });
    test('agendamento manual pendente pode ser excluído', () => { const s = cmd(fixture(), 'next', { dueDate: '2026-09-20' }); const updated = cmd(s, 'deleteTask', { taskId: s.tasks[3].id }); expect(updated.tasks[3].status).toBe('cancelled'); });
    test('resposta impede arquivamento', () => { const s = completeCycle(); s.opportunity.responseReceived = true; expect(archiveOpportunity(s.opportunity, s.tasks, '2026-10-30T15:00:00Z')).toBeNull(); });
    test('negociação ativa gera próxima ação e cancela agenda automática', () => { const s = cmd(fixture(), 'stage', { stage: 'Em negociação', nextDate: '2026-09-12' }); expect(s.tasks.filter(t => t.status === 'pending')).toHaveLength(1); expect(s.tasks[3].kind).toBe('Manual'); expect(s.opportunity.archiveDate).toBeNull(); });
    test('negociação sem data não cria próxima ação automática', () => { const s = cmd(fixture(), 'stage', { stage: 'Em negociação' }); expect(s.tasks.filter(t => t.status === 'pending')).toHaveLength(0); expect(s.opportunity.responseReceived).toBe(true); });
    test('contato repetido rejeitado sem duplicar', () => { const s = completeCycle(); expect(() => cmd(s, 'contact', { taskId: s.tasks[0].id, result: 'Sem resposta', contactDate: '2026-09-02' })).toThrow('não está pendente'); });
    test('correção de envio preserva datas manuais', () => { let s = cmd(fixture(), 'reschedule', { taskId: fixture().tasks[0].id, dueDate: '2026-09-15', reason: 'Combinado' }); s = cmd(s, 'correctSentDate', { sentDate: '2026-09-02' }, '2026-09-03T15:00:00Z'); expect(s.tasks[0].dueDate).toBe('2026-09-15'); expect(s.tasks[1].dueDate).toBe('2026-09-07'); });
    test('retomada tardia mantém D+30 original', () => { const s = completeCycle(); const archived = archiveOpportunity(s.opportunity, s.tasks, '2026-11-01T15:00:00Z')!; expect(archived.tasks[3].dueDate).toBe('2026-10-01'); });
    test('retomada arquivada pode ser reagendada', () => { const s = completeCycle(); const archived = archiveOpportunity(s.opportunity, s.tasks, '2026-09-13T15:00:00Z')!; expect(cmd(archived, 'reschedule', { taskId: archived.tasks[3].id, dueDate: '2026-10-10', reason: 'Cliente solicitou' }, '2026-09-14T15:00:00Z').tasks[3].dueDate).toBe('2026-10-10'); });
    test('entrada e histórico originais não são mutados', () => { const s = fixture(); const before = JSON.stringify(s); cmd(s, 'edit', { notes: 'Novo texto' }); expect(JSON.stringify(s)).toBe(before); });
    test('contato futuro é rejeitado', () => expect(() => cmd(fixture(), 'contact', { taskId: fixture().tasks[0].id, result: 'Sem resposta', contactDate: '2030-01-01' })).toThrow('Data do contato'));
    test('configuração valida feriados reais', () => expect(() => validateSettings({ ...DEFAULT_SETTINGS, holidays: ['2026-02-30'] })).toThrow('Data inválida'));
});
