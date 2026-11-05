import { useEffect, useId, useRef, useState } from 'react';

export type ComboboxOption = { value: string; label: string; sub?: string };

type Props = {
    name?: string;
    value: string;
    onChange: (value: string) => void;
    options: ComboboxOption[];
    placeholder?: string;
    emptyLabel?: string;
};

/** Searchable combobox that replaces a native <select>.
 *  Keeps a hidden <input> so it participates in FormData under `name`. */
export function Combobox({ name, value, onChange, options, placeholder = 'Buscar…', emptyLabel = '— nenhum —' }: Props) {
    const id = useId();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    const selected = options.find(o => o.value === value);

    const filtered = query.trim()
        ? options.filter(o =>
            o.label.toLowerCase().includes(query.toLowerCase()) ||
            (o.sub ?? '').toLowerCase().includes(query.toLowerCase())
        )
        : options;

    // close on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    function pick(val: string) {
        onChange(val);
        setOpen(false);
        setQuery('');
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Escape') { setOpen(false); setQuery(''); return; }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const items = listRef.current?.querySelectorAll<HTMLLIElement>('[role="option"]');
            (items?.[0] as HTMLElement | undefined)?.focus();
        }
    }

    function handleListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
        const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
        const idx = items.indexOf(e.currentTarget.ownerDocument.activeElement as HTMLElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); items[idx + 1]?.focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); idx > 0 ? items[idx - 1]?.focus() : inputRef.current?.focus(); }
        else if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.focus(); }
    }

    return (
        <div className="combobox" ref={wrapRef}>
            {/* hidden input so FormData picks up the value */}
            {name && <input type="hidden" name={name} value={value} />}

            <button
                type="button"
                id={id}
                className="combobox-trigger"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 0); }}
            >
                <span className={selected ? '' : 'combobox-placeholder'}>
                    {selected ? selected.label : emptyLabel}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={`combobox-caret${open ? ' open' : ''}`}>
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <div className="combobox-dropdown" role="dialog">
                    <div className="combobox-search">
                        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                            <circle cx="6.5" cy="6.5" r="5" stroke="#8898aa" strokeWidth="1.5" fill="none" />
                            <line x1="10.5" y1="10.5" x2="15" y2="15" stroke="#8898aa" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={placeholder}
                            onKeyDown={handleKeyDown}
                            autoComplete="off"
                        />
                        {query && (
                            <button type="button" className="combobox-clear" onClick={() => setQuery('')} aria-label="Limpar busca">×</button>
                        )}
                    </div>
                    <ul ref={listRef} role="listbox" className="combobox-list" onKeyDown={handleListKeyDown}>
                        {/* "none" option */}
                        <li
                            role="option"
                            aria-selected={value === ''}
                            tabIndex={0}
                            className={`combobox-option${value === '' ? ' selected' : ''}`}
                            onClick={() => pick('')}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') pick(''); }}
                        >
                            {emptyLabel}
                        </li>
                        {filtered.map(o => (
                            <li
                                key={o.value}
                                role="option"
                                aria-selected={o.value === value}
                                tabIndex={0}
                                className={`combobox-option${o.value === value ? ' selected' : ''}`}
                                onClick={() => pick(o.value)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') pick(o.value); }}
                            >
                                <span>{o.label}</span>
                                {o.sub && <small>{o.sub}</small>}
                            </li>
                        ))}
                        {filtered.length === 0 && (
                            <li className="combobox-empty">Nenhum resultado para "{query}"</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

