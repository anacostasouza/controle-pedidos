import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactElement, ReactNode } from 'react';

export function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
    const id = useId();
    const items = Children.toArray(children);
    const control = items.find(child => isValidElement(child) && typeof child.type === 'string' && ['input', 'select', 'textarea'].includes(child.type));
    return <div className={`field ${wide ? 'wide' : ''}`}><label htmlFor={control ? id : undefined}>{label}</label>{items.map(child => child === control ? cloneElement(child as ReactElement<{ id: string }>, { id }) : child)}</div>;
}

export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => { ref.current?.showModal(); }, []);
    return <dialog ref={ref} className="modal" onCancel={close} onClick={event => { if (event.target === ref.current) close(); }}><div className="modal-head"><h2>{title}</h2><button type="button" className="icon-button" onClick={close} aria-label="Fechar">×</button></div>{children}</dialog>;
}

export function Stars({ value, onChange, disabled }: { value: number; onChange?: (value: number) => void; disabled?: boolean }) {
    return <span className="stars" aria-label={value ? `${value} de 5 estrelas` : 'Sem avaliação'}>{[1, 2, 3, 4, 5].map(number => onChange ? <button type="button" key={number} disabled={disabled} aria-label={`${number} estrela${number > 1 ? 's' : ''}`} aria-pressed={number === value} onClick={() => onChange(number === value ? 0 : number)} className={number <= value ? 'filled' : ''}>★</button> : <span key={number} className={number <= value ? 'filled' : ''}>★</span>)}</span>;
}

export function AsyncForm({ children, save, label = 'Salvar', className = '', disabled = false }: { children: ReactNode; save: (data: FormData) => Promise<void>; label?: string; className?: string; disabled?: boolean }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError('');
        try { await save(new FormData(event.currentTarget)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.'); } finally { setBusy(false); }
    }
    return <form onSubmit={submit} className={className}><fieldset disabled={busy || disabled}>{children}</fieldset>{error && <p className="error" role="alert">{error}</p>}<button className="primary" disabled={busy || disabled} type="submit">{busy ? 'Salvando…' : label}</button></form>;
}

export const str = (form: FormData, key: string) => String(form.get(key) || '');
export const Empty = ({ children }: { children: ReactNode }) => <div className="empty"><span className="empty-mark">✓</span><p>{children}</p></div>;
