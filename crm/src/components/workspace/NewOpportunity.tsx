import { useState } from 'react';
import { api } from '../../services/crmApi';
import type { Bootstrap, Client, Company } from '../../services/crmApi';
import { AsyncForm, Field, Modal, str } from '../../components';
import { CompanySelect } from '../../CompanySelect';

type NewOpportunityProps = {
    boot: Bootstrap;
    clients: Client[];
    companies: Company[];
    close: () => void;
    saved: (id: string) => void;
};

export function NewOpportunity({ boot, clients, companies, close, saved }: NewOpportunityProps) {
    const [clientId, setClientId] = useState('');
    const [newId] = useState(() => crypto.randomUUID());
    const [opportunityId] = useState(() => crypto.randomUUID());
    const [clientCreated, setClientCreated] = useState(false);

    return <Modal title="Nova oportunidade" close={close}><p className="muted">Registre o contato e encaminhe ao vendedor. Os demais dados podem ser preenchidos depois.</p><AsyncForm label="Criar oportunidade" save={async (f) => {
        const cid = clientId || newId;
        if (!clientId && !clientCreated) {
            await api(`/clients/${cid}`, 'PUT', { name: str(f, 'name'), phone: str(f, 'phone'), email: str(f, 'email'), companyId: str(f, 'companyId'), active: true });
            setClientCreated(true);
        }
        await api('/opportunities', 'POST', { id: opportunityId, clientId: cid, ownerId: str(f, 'ownerId'), channel: str(f, 'channel'), notes: str(f, 'notes') });
        saved(opportunityId);
    }}><div className="form-grid"><Field label="Cliente cadastrado" wide><select value={clientId} onChange={e => setClientId(e.target.value)}><option value="">Cadastrar novo cliente</option>{clients.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>{!clientId && <><Field label="Nome do cliente *"><input name="name" required maxLength={180}/></Field><CompanySelect companies={companies}/><Field label="Telefone"><input name="phone" type="tel" placeholder="(00) 00000-0000"/></Field><Field label="E-mail"><input name="email" type="email" placeholder="nome@empresa.com"/></Field><p className="wide muted">Preencha pelo menos telefone ou e-mail.</p></>}<Field label="Vendedor responsável"><select name="ownerId" defaultValue={boot.actor.role === 'vendedor' ? boot.actor.uid : ''}><option value="">Aguardando distribuição</option>{boot.users.filter(u => u.active && ['vendedor', 'admin', 'coordenacao'].includes(u.role)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field><Field label="Canal de entrada"><select name="channel"><option value="">Selecionar depois</option>{boot.settings.channels.map(c => <option key={c}>{c}</option>)}</select></Field><Field label="Demanda / anotações" wide><textarea name="notes" rows={4}/></Field></div></AsyncForm></Modal>;
}
