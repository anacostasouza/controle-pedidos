import { useState } from 'react';
import { LOSSES, STAGES, today } from '../../services/crmApi';
import type { Opportunity } from '../../services/crmApi';
import { AsyncForm, Field, str } from '../../components';

export type Action = (name: string, body: Record<string, unknown>) => Promise<void>;

export function StageForm({ opportunity, o, action }: { opportunity?: Opportunity; o?: Opportunity; action: Action }) {
    const current = opportunity || o;
    const [stage, setStage] = useState(current?.stage || STAGES[0]);
    if (!current) return null;
    return <details className="action-block"><summary>Mover no funil</summary><AsyncForm label="Mover oportunidade" save={async form => { await action('stage', { stage, nextDate: str(form, 'nextDate') }); }}><Field label="Etapa"><select value={stage} onChange={event => setStage(event.target.value as Opportunity['stage'])}>{STAGES.filter(value => value !== 'Conclusão').map(value => <option key={value}>{value}</option>)}</select></Field>{stage === 'Em negociação' && <Field label="Próxima ação (opcional)"><input type="date" name="nextDate" min={today()} /></Field>}</AsyncForm></details>;
}

export function CloseForm({ action }: { action: Action }) {
    const [outcome, setOutcome] = useState('Conquistado');
    const [reason, setReason] = useState('Especificação');
    return <details className="action-block"><summary>Concluir oportunidade</summary><AsyncForm label="Registrar conclusão" save={async form => { await action('close', { outcome, lossReason: reason, closingNotes: str(form, 'closingNotes') }); }}><Field label="Resultado"><select value={outcome} onChange={event => setOutcome(event.target.value)}>{['Conquistado', 'Perdido', 'Desistência'].map(value => <option key={value}>{value}</option>)}</select></Field>{outcome === 'Perdido' && <Field label="Motivo da perda *"><select value={reason} onChange={event => setReason(event.target.value)}>{LOSSES.map(value => <option key={value}>{value}</option>)}</select></Field>}<Field label="Observações"><textarea name="closingNotes" required={outcome === 'Perdido' && reason === 'Outro'} /></Field><p className="muted">As tarefas pendentes serão canceladas, preservando o histórico.</p></AsyncForm></details>;
}
