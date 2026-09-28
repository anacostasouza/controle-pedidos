export type Role = 'recepcao' | 'vendedor' | 'orcamentista' | 'coordenacao' | 'admin' | 'leitura';

export type Stage = 'Lead qualificado' | 'Elaboração de proposta' | 'Proposta enviada' | 'Em negociação' | 'Conclusão';
export type OpportunityState = 'active' | 'archived' | 'closed';

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

export interface Client {
    id: string;
    name: string;
    phone: string;
    email: string;
    companyId: string;
    active: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface Company {
    id: string;
    name: string;
    cnpj: string;
    active: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface Opportunity {
    id: string;
    clientId: string;
    ownerId: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    stage: Stage;
    state: OpportunityState;
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
    reschedules: { from: string; to: string; at: string; by: string; reason: string }[];
}

export interface User {
    id: string;
    name: string;
    sector: string;
    active: boolean;
    role: Role;
}

export interface Bootstrap { actor: Actor; settings: Settings; users: User[]; }
export interface Row extends Opportunity { client?: Client; company?: Company; canEdit: boolean; }
export interface TaskRow extends Task { opportunity?: Opportunity; client?: Client; company?: Company; }
export interface Page<T> { items: T[]; total: number; nextOffset: number | null; }
export interface History { id: string; at: string; actorName: string; action: string; changes?: Record<string, { from: unknown; to: unknown }>; notes?: string; reason?: string; }
export interface Detail { opportunity: Opportunity; tasks: Task[]; history: History[]; canEdit: boolean; }
export interface DayData { day: string; metrics: { portfolio: number; activeCount: number; missingValue: number; wonValue: number; wonCount: number; negotiationValue: number; contacts: number; planned: number; done: number; }; tasks: TaskRow[]; }
