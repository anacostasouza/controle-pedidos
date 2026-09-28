/** Pure CRM rules. All dates are business dates in America/Sao_Paulo. */
export const STAGES = ['Lead qualificado', 'Elaboração de proposta', 'Proposta enviada', 'Em negociação', 'Conclusão'] as const;
export const LOSSES = ['Especificação', 'Preço', 'Prazo', 'Atraso no envio da proposta', 'Outro'] as const;
export type Role = 'recepcao' | 'vendedor' | 'orcamentista' | 'coordenacao' | 'admin' | 'leitura';
export interface Actor {
    uid: string;
    name: string;
    role: Role;
}
export interface Settings {
    holidays: string[];
    channels: string[];
    serviceGroups: string[];
    approverIds: string[];
}
// Initial service groups mirror controle-pedidos/src/types/Servicos.ts.
export const SERVICE_LABELS: Record<string, string> = { ARTE: 'Arte', GRAFICA_RAPIDA: 'Gráfica Rápida', IMPRESSAO_DIGITAL: 'Impressão Digital', COMUNICACAO_VISUAL: 'Comunicação Visual', TERCEIRIZADO: 'Terceirizado', PLOTAGEM: 'Plotagem' };
export const DEFAULT_SETTINGS: Settings = { holidays: [], channels: ['Telefone', 'WhatsApp', 'E-mail', 'Presencial', 'Indicação', 'Site'], serviceGroups: Object.values(SERVICE_LABELS), approverIds: [] };
export interface Client {
    id: string;
    name: string;
    phone: string;
    email: string;
    companyId: string;
    active: boolean;
    createdAt: string;
}
export interface Company {
    id: string;
    name: string;
    cnpj: string;
    active: boolean;
    createdAt: string;
}
export interface Opportunity {
    id: string;
    clientId: string;
    ownerId: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    stage: typeof STAGES[number];
    state: 'active' | 'archived' | 'closed';
    channel: string;
    serviceGroup: string;
    notes: string;
    valueCents: number | null;
    rating: number;
    complexity: 'simple' | 'complex';
    estimatorId: string;
    budgetStatus: 'A elaborar' | 'Em elaboração' | 'Recebido/concluído';
    approval: 'Não se aplica' | 'Pendente' | 'Aprovada' | 'Não aprovada';
    sentDate: string | null;
    cycle: number;
    version: number;
    archiveDate: string | null;
    responseReceived: boolean;
    outcome: '' | 'Conquistado' | 'Perdido' | 'Desistência';
    lossReason: string;
    closingNotes: string;
    closedAt: string | null;
    objection: string;
}
export interface Task {
    id: string;
    opportunityId: string;
    ownerId: string;
    kind: 'D+1' | 'D+3' | 'D+7' | 'Retomada' | 'Manual' | 'Coordenação';
    cycle: number;
    dueDate: string;
    originalDueDate: string;
    source: 'automatic' | 'manual';
    status: 'pending' | 'done' | 'cancelled';
    result: string;
    notes: string;
    completedDate: string | null;
    completedAt: string | null;
    finalFollowUp: boolean;
    createdAt: string;
    reschedules: {
        from: string;
        to: string;
        at: string;
        by: string;
        reason: string;
    }[];
}
export class CrmError extends Error {
    status: number;
    constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function ensure(condition: unknown, message: string, status = 400): asserts condition { if (!condition)
    throw new CrmError(message, status); }
export function text(value: unknown, label: string, max = 5000, required = false): string {
    ensure(typeof value === 'string', `${label}: texto inválido.`);
    const result = value.trim();
    ensure(result.length <= max && (!required || result.length > 0), `${label}: preenchimento inválido.`);
    return result;
}
export function date(value: unknown): string {
    ensure(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Data inválida.');
    const parsed = new Date(`${value}T12:00:00Z`);
    ensure(!isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value, 'Data inválida.');
    return value;
}
export function today(now = new Date()): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
export function addDays(value: string, amount: number): string { const d = new Date(`${date(value)}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + amount); return d.toISOString().slice(0, 10); }
export function businessDays(value: string, amount: number, holidays: string[]): string {
    let result = value, count = 0;
    while (count < amount) {
        result = addDays(result, 1);
        const day = new Date(`${result}T12:00:00Z`).getUTCDay();
        if (day !== 0 && day !== 6 && !holidays.includes(result))
            count++;
    }
    return result;
}
export function roleForSector(sector: string): Role {
    if (['SUPORTE', 'GESTAO'].includes(sector))
        return 'admin';
    if (['BALCAO', 'CAIXA'].includes(sector))
        return 'recepcao';
    if (sector === 'COMERCIAL')
        return 'vendedor';
    if (sector === 'ARTE')
        return 'orcamentista';
    return 'leitura';
}
export function canEdit(actor: Actor, o: Opportunity): boolean { return ['admin', 'coordenacao'].includes(actor.role) || (actor.role === 'vendedor' && actor.uid === o.ownerId) || (actor.role === 'recepcao' && (!o.ownerId || o.createdBy === actor.uid)); }
export function newOpportunity(id: string, clientId: string, actor: Actor, now: string): Opportunity {
    ensure(['admin', 'coordenacao', 'recepcao', 'vendedor'].includes(actor.role), 'Sem permissão para criar oportunidades.', 403);
    return { id, clientId, ownerId: actor.role === 'vendedor' ? actor.uid : '', createdBy: actor.uid, createdAt: now, updatedAt: now, stage: STAGES[0], state: 'active', channel: '', serviceGroup: '', notes: '', valueCents: null, rating: 0, complexity: 'simple', estimatorId: '', budgetStatus: 'A elaborar', approval: 'Não se aplica', sentDate: null, cycle: 0, version: 0, archiveDate: null, responseReceived: false, outcome: '', lossReason: '', closingNotes: '', closedAt: null, objection: '' };
}
function pick<T extends string>(value: unknown, list: readonly T[], label: string): T { ensure(typeof value === 'string' && list.includes(value as T), `${label}: opção inválida.`); return value as T; }
export function validateSettings(raw: Record<string, unknown>): Settings {
    const list = (key: string, max: number) => { const values = raw[key]; ensure(Array.isArray(values) && values.length <= max, `${key}: lista inválida.`); return [...new Set(values.map(v => text(v, key, 150, true)))]; };
    return { holidays: list('holidays', 3660).map(date), channels: list('channels', 100), serviceGroups: list('serviceGroups', 100), approverIds: list('approverIds', 100) };
}
export function patchOpportunity(o: Opportunity, raw: Record<string, unknown>, settings: Settings): void {
    const previousChannel = o.channel, previousServiceGroup = o.serviceGroup;
    for (const key of ['channel', 'serviceGroup', 'notes', 'ownerId', 'estimatorId'] as const)
        if (raw[key] !== undefined)
            o[key] = text(raw[key], key, key === 'notes' ? 10000 : 150);
    // Retired classifications remain valid on existing opportunities.
    if (raw.channel !== undefined && o.channel)
        ensure(settings.channels.includes(o.channel) || o.channel === previousChannel, 'Canal não cadastrado.');
    if (raw.serviceGroup !== undefined && o.serviceGroup)
        ensure(settings.serviceGroups.includes(o.serviceGroup) || o.serviceGroup === previousServiceGroup, 'Grupo de serviços não cadastrado.');
    if (raw.rating !== undefined) {
        ensure(Number.isInteger(raw.rating) && Number(raw.rating) >= 0 && Number(raw.rating) <= 5, 'Avaliação deve estar entre 0 e 5 estrelas.');
        o.rating = Number(raw.rating);
    }
    if (raw.valueCents !== undefined) {
        ensure(raw.valueCents === null || (Number.isSafeInteger(raw.valueCents) && Number(raw.valueCents) >= 0), 'Valor inválido.');
        o.valueCents = raw.valueCents as number | null;
    }
    if (raw.complexity !== undefined) {
        o.complexity = pick(raw.complexity, ['simple', 'complex'], 'Complexidade');
        if (o.complexity === 'simple')
            o.approval = 'Não se aplica';
        else if (o.approval === 'Não se aplica')
            o.approval = 'Pendente';
    }
    if (raw.budgetStatus !== undefined)
        o.budgetStatus = pick(raw.budgetStatus, ['A elaborar', 'Em elaboração', 'Recebido/concluído'], 'Orçamento');
}
function makeTask(o: Opportunity, kind: Task['kind'], due: string, now: string, suffix: string, final = false): Task {
    return { id: `${o.id}_${o.cycle}_${suffix}`, opportunityId: o.id, ownerId: o.ownerId, kind, cycle: o.cycle, dueDate: due, originalDueDate: due, source: kind === 'Manual' || kind === 'Coordenação' ? 'manual' : 'automatic', status: 'pending', result: '', notes: '', completedDate: null, completedAt: null, finalFollowUp: final, createdAt: now, reschedules: [] };
}
export function archiveDue(o: Opportunity, tasks: Task[]): string | null {
    if (o.state !== 'active' || !o.sentDate || o.responseReceived || o.stage === 'Em negociação')
        return null;
    const current = tasks.filter(t => t.cycle === o.cycle && t.kind !== 'Coordenação');
    if (current.some(t => t.status === 'pending'))
        return null;
    const finals = current.filter(t => t.finalFollowUp && t.status === 'done' && t.result === 'Sem resposta' && t.completedDate).sort((a, b) => b.completedDate!.localeCompare(a.completedDate!));
    return finals.length ? addDays(finals[0].completedDate!, 3) : null;
}
export function applyCommand(original: Opportunity, originalTasks: Task[], actor: Actor, command: string, raw: Record<string, unknown>, settings: Settings, now: string): {
    opportunity: Opportunity;
    tasks: Task[];
} {
    const o: Opportunity = JSON.parse(JSON.stringify(original));
    const tasks: Task[] = JSON.parse(JSON.stringify(originalTasks));
    const day = today(new Date(now));
    const approvalOnly = command === 'approve' && settings.approverIds.includes(actor.uid);
    const estimatorOnly = command === 'budget' && o.estimatorId === actor.uid && actor.role === 'orcamentista';
    const taskOnly = ['contact', 'reschedule'].includes(command) && tasks.some(t => t.id === raw.taskId && t.kind === 'Coordenação' && t.ownerId === actor.uid);
    ensure(canEdit(actor, o) || approvalOnly || estimatorOnly || taskOnly, 'Sem permissão para alterar esta oportunidade.', 403);
    ensure(raw.version === o.version, 'A oportunidade foi alterada. Atualize a tela e tente novamente.', 409);
    ensure(o.state === 'active' || command === 'reopen' || (['contact', 'reschedule'].includes(command) && o.state === 'archived'), 'Reative a oportunidade antes de alterá-la.');
    const cancelPending = (reason: string) => tasks.filter(t => t.status === 'pending').forEach(t => { t.status = 'cancelled'; t.notes = reason; });
    switch (command) {
        case 'edit': {
            const previousOwner = o.ownerId;
            patchOpportunity(o, raw, settings);
            ensure(!o.sentDate || o.ownerId, 'Uma oportunidade com proposta enviada precisa de vendedor.');
            if (previousOwner !== o.ownerId)
                tasks.filter(t => t.status === 'pending' && t.kind !== 'Coordenação').forEach(t => { t.ownerId = o.ownerId; });
            break;
        }
        case 'budget':
            o.budgetStatus = pick(raw.budgetStatus, ['A elaborar', 'Em elaboração', 'Recebido/concluído'], 'Orçamento');
            break;
        case 'approve':
            ensure(settings.approverIds.includes(actor.uid), 'Validador não configurado para este usuário.', 403);
            ensure(o.complexity === 'complex', 'Aprovação aplicável somente a proposta complexa.');
            o.approval = pick(raw.approval, ['Pendente', 'Aprovada', 'Não aprovada'], 'Aprovação');
            break;
        case 'stage': {
            const stage = pick(raw.stage, STAGES, 'Etapa');
            ensure(stage !== 'Conclusão', 'Utilize a ação Concluir para registrar o resultado.');
            ensure(stage !== 'Proposta enviada' || o.sentDate, 'Registre o envio da proposta primeiro.');
            if (stage === 'Em negociação') {
                ensure(o.sentDate, 'Registre o envio antes da negociação.');
                tasks.filter(t => t.status === 'pending' && t.kind !== 'Coordenação').forEach(t => { t.status = 'cancelled'; t.notes = 'Substituída pela próxima ação de negociação.'; });
                o.responseReceived = true;
                if (raw.nextDate) {
                    const due = date(raw.nextDate);
                    ensure(due >= day, 'Próxima ação não pode estar no passado.');
                    tasks.push(makeTask(o, 'Manual', due, now, `manual_${o.version + 1}`));
                }
            }
            o.stage = stage;
            break;
        }
        case 'send': {
            ensure(o.ownerId, 'Defina o vendedor responsável antes de enviar.');
            ensure(!o.sentDate || raw.newCycle === true, 'Envio já registrado. Para reenviar, inicie explicitamente um novo ciclo.');
            const sent = date(raw.sentDate);
            ensure(sent <= day, 'A data de envio não pode estar no futuro.');
            cancelPending('Substituída por novo ciclo de proposta.');
            o.sentDate = sent;
            o.cycle++;
            o.responseReceived = false;
            o.stage = 'Proposta enviada';
            for (const n of [1, 3, 7])
                tasks.push(makeTask(o, `D+${n}` as Task['kind'], businessDays(sent, n, settings.holidays), now, `d${n}`, n === 7));
            break;
        }
        case 'correctSentDate': {
            ensure(o.sentDate, 'Nenhuma proposta enviada.');
            const sent = date(raw.sentDate);
            ensure(sent <= day, 'A data de envio não pode estar no futuro.');
            o.sentDate = sent;
            tasks.filter(t => t.cycle === o.cycle && t.status === 'pending' && t.source === 'automatic').forEach(t => { const due = t.kind === 'Retomada' ? addDays(sent, 30) : businessDays(sent, Number(t.kind.slice(2)), settings.holidays); t.reschedules.push({ from: t.dueDate, to: due, at: now, by: actor.uid, reason: 'Correção da data de envio.' }); t.dueDate = due; });
            break;
        }
        case 'reschedule': {
            const t = tasks.find(t => t.id === raw.taskId);
            ensure(t && t.status === 'pending', 'Tarefa não está pendente.');
            if (o.state === 'archived')
                ensure(t.kind === 'Retomada', 'Reative a oportunidade.');
            const due = date(raw.dueDate);
            ensure(due >= day, 'Nova data não pode estar no passado.');
            t.reschedules.push({ from: t.dueDate, to: due, at: now, by: actor.uid, reason: text(raw.reason, 'Justificativa', 1000, true) });
            t.dueDate = due;
            t.source = 'manual';
            break;
        }
        case 'next': {
            ensure(o.sentDate && o.ownerId, 'Registre o envio e o vendedor primeiro.');
            const due = date(raw.dueDate);
            ensure(due >= day, 'Data não pode estar no passado.');
            tasks.filter(t => t.status === 'pending' && t.kind !== 'Coordenação' && t.dueDate < due).forEach(t => { t.status = 'cancelled'; t.notes = 'Substituída por um novo follow-up manual.'; });
            const t = makeTask(o, 'Manual', due, now, `manual_${o.version + 1}`, true);
            t.notes = text(raw.notes || '', 'Anotações');
            tasks.push(t);
            break;
        }
        case 'deleteTask': {
            const t = tasks.find(task => task.id === raw.taskId);
            ensure(t && t.status === 'pending' && t.source === 'manual', 'Somente agendamentos manuais pendentes podem ser excluídos.');
            t.status = 'cancelled';
            t.notes = 'Agendamento excluído pelo responsável.';
            break;
        }
        case 'contact': {
            const t = tasks.find(t => t.id === raw.taskId);
            ensure(t && t.status === 'pending', 'Tarefa não está pendente.');
            if (o.state === 'archived')
                ensure(t.kind === 'Retomada', 'Reative a oportunidade.');
            const result = pick(raw.result, ['Sem resposta', 'Respondeu', 'Em negociação', 'Encerrado'], 'Resultado');
            ensure(result !== 'Encerrado', 'Use Concluir oportunidade para registrar o desfecho e cancelar as tarefas.');
            const contactDay = date(raw.contactDate);
            ensure(contactDay <= day && contactDay >= today(new Date(t.createdAt)), 'Data do contato deve estar entre a criação da tarefa e hoje.');
            t.status = 'done';
            t.result = result;
            t.notes = text(raw.notes || '', 'Anotações');
            t.completedDate = contactDay;
            t.completedAt = now;
            if (t.kind !== 'Coordenação' && result !== 'Sem resposta') {
                o.responseReceived = true;
                o.state = 'active';
            }
            if (t.kind !== 'Coordenação' && result === 'Em negociação') {
                const due = date(raw.nextDate);
                ensure(due >= day, 'Defina a próxima ação a partir de hoje.');
                o.stage = 'Em negociação';
                tasks.filter(t => t.status === 'pending' && t.kind !== 'Coordenação').forEach(t => { t.status = 'cancelled'; t.notes = 'Substituída pela próxima ação da negociação.'; });
                tasks.push(makeTask(o, 'Manual', due, now, `manual_${o.version + 1}`));
            }
            break;
        }
        case 'objection': {
            o.objection = text(raw.objection, 'Objeção', 5000, true);
            if (raw.coordinatorId) {
                const due = date(raw.dueDate);
                ensure(due >= day, 'Data de apoio inválida.');
                const t = makeTask(o, 'Coordenação', due, now, `support_${o.version + 1}`);
                t.ownerId = text(raw.coordinatorId, 'Coordenação', 150, true);
                t.notes = o.objection;
                tasks.push(t);
            }
            break;
        }
        case 'close': {
            o.outcome = pick(raw.outcome, ['Conquistado', 'Perdido', 'Desistência'], 'Resultado');
            o.closingNotes = text(raw.closingNotes || '', 'Observações');
            o.lossReason = o.outcome === 'Perdido' ? pick(raw.lossReason, LOSSES, 'Motivo de perda') : '';
            ensure(o.lossReason !== 'Outro' || o.closingNotes, 'Descreva o motivo da perda.');
            o.state = 'closed';
            o.stage = 'Conclusão';
            o.closedAt = now;
            cancelPending('Oportunidade concluída.');
            break;
        }
        case 'reopen': {
            ensure(o.state !== 'active', 'Oportunidade já está ativa.');
            ensure(text(raw.reason, 'Motivo de reabertura', 1000, true), 'Informe o motivo.');
            o.state = 'active';
            o.stage = o.sentDate ? 'Proposta enviada' : 'Lead qualificado';
            o.outcome = '';
            o.lossReason = '';
            o.closingNotes = '';
            o.closedAt = null;
            // A reabertura exige ação manual; não recria automaticamente o ciclo antigo.
            if (o.sentDate) {
                const due = date(raw.dueDate);
                ensure(due >= day, 'Defina a próxima ação.');
                cancelPending('Substituída pela reabertura.');
                tasks.push(makeTask(o, 'Manual', due, now, `reopen_${o.version + 1}`, true));
            }
            break;
        }
        default: throw new CrmError('Ação desconhecida.');
    }
    ensure(tasks.length <= 350, 'Limite de histórico de tarefas desta oportunidade atingido. Solicite suporte.');
    o.version++;
    o.updatedAt = now;
    o.archiveDate = archiveDue(o, tasks);
    return { opportunity: o, tasks };
}
export function archiveOpportunity(original: Opportunity, tasks: Task[], now: string): {
    opportunity: Opportunity;
    tasks: Task[];
} | null {
    const due = archiveDue(original, tasks);
    if (!due || due > today(new Date(now)))
        return null;
    const o = { ...original, state: 'archived' as const, archiveDate: due, updatedAt: now, version: original.version + 1 };
    const result = [...tasks];
    const id = `${o.id}_${o.cycle}_retomada`;
    if (!result.some(t => t.id === id))
        result.push(makeTask(o, 'Retomada', addDays(o.sentDate!, 30), now, 'retomada'));
    return { opportunity: o, tasks: result };
}
