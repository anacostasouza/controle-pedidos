import { useState } from 'react';
import { api } from './services/crmApi';
import type { Company } from './services/crmApi';
import { Field } from './components';
/** Creates a company in-place without nesting forms or losing the client draft. */
export function CompanySelect({ companies, defaultValue = '' }: {
    companies: Company[];
    defaultValue?: string;
}) {
    const [value, setValue] = useState(defaultValue), [created, setCreated] = useState<Company[]>([]);
    const [adding, setAdding] = useState(false), [name, setName] = useState(''), [cnpj, setCnpj] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function create() {
        if (!name.trim()) {
            setError('Informe o nome da empresa.');
            return;
        }
        if (cnpj.replace(/\D/g, '').length !== 14) {
            setError('Informe um CNPJ com 14 dígitos.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const company: Company = { id: crypto.randomUUID(), name: name.trim(), cnpj: cnpj.replace(/\D/g, ''), active: true, createdAt: new Date().toISOString() };
            await api(`/companies/${company.id}`, 'PUT', { name: company.name, cnpj: company.cnpj, active: true });
            setCreated(c => [...c, company]);
            setValue(company.id);
            setAdding(false);
            setName('');
            setCnpj('');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Não foi possível cadastrar a empresa.');
        }
        finally {
            setBusy(false);
        }
    }
    return <div><Field label="Empresa (opcional)"><select name="companyId" value={value} onChange={e => setValue(e.target.value)}><option value="">Sem empresa</option>{[...companies, ...created].filter((c, i, all) => all.findIndex(x => x.id === c.id) === i && (c.active || c.id === value)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>{adding ? <div className="inline-company"><Field label="Nome da nova empresa"><input value={name} maxLength={180} onChange={e => setName(e.target.value)}/></Field><Field label="CNPJ"><input value={cnpj} maxLength={18} placeholder="00.000.000/0000-00" onChange={e => setCnpj(e.target.value)}/></Field><button type="button" disabled={busy} onClick={create}>{busy ? 'Cadastrando…' : 'Cadastrar e vincular'}</button><button type="button" onClick={() => setAdding(false)}>Cancelar</button>{error && <p className="error" role="alert">{error}</p>}</div> : <button type="button" className="text-button" onClick={() => setAdding(true)}>＋ Nova empresa</button>}</div>;
}
