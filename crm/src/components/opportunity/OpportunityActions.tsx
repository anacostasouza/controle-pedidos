import { useState } from 'react';
import { LOSSES, STAGES, today } from '../../services/crmApi';
import type { Opportunity } from '../../services/crmApi';
import { AsyncForm, Field, str } from '../../components';

export type Action = (name: string, body: Record<string, unknown>) => Promise<void>;

export function StageForm({ opportunity, o, action }: { opportunity?: Opportunity; o?: Opportunity; action: Action }) {
    const current = opportunity || o;
    const [stage, setStage] = useState(current?.stage || STAGES[0]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    if (!current) return null;
    async function saveStage(nextStage: Opportunity['stage'], nextDate = '') {
        setSaving(true);
        setError('');
        try {
            await action('stage', { stage: nextStage, nextDate });
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a etapa.');
        } finally {
            setSaving(false);
        }
    }
    return <details className="action-block"><summary>Mover no funil</summary><Field label="Etapa"><select value={stage} disabled={saving} onChange={event => { const nextStage = event.target.value as Opportunity['stage']; setStage(nextStage); void saveStage(nextStage); }}>{STAGES.filter(value => value !== 'Conclusão').map(value => <option key={value}>{value}</option>)}</select></Field>{stage === 'Em negociação' && <Field label="Próxima ação (opcional)"><input type="date" name="nextDate" min={today()} disabled={saving} onChange={event => void saveStage(stage, event.target.value)} /></Field>}{saving && <small className="muted">Salvando alteração…</small>}{error && <p className="error">{error}</p>}</details>;
}

export function CloseForm({ action }: { action: Action }) {
    const [outcome, setOutcome] = useState('Conquistado');
    const [reason, setReason] = useState('Especificação');
    return <details className="action-block"><summary>Concluir oportunidade</summary><AsyncForm label="Registrar conclusão" save={async form => { await action('close', { outcome, lossReason: reason, closingNotes: str(form, 'closingNotes') }); }}><Field label="Resultado"><select value={outcome} onChange={event => setOutcome(event.target.value)}>{['Conquistado', 'Perdido', 'Desistência'].map(value => <option key={value}>{value}</option>)}</select></Field>{outcome === 'Perdido' && <Field label="Motivo da perda *"><select value={reason} onChange={event => setReason(event.target.value)}>{LOSSES.map(value => <option key={value}>{value}</option>)}</select></Field>}<Field label="Observações"><textarea name="closingNotes" required={outcome === 'Perdido' && reason === 'Outro'} /></Field><p className="muted">As tarefas pendentes serão canceladas, preservando o histórico.</p></AsyncForm></details>;
}
