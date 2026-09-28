type WorkspaceHeaderProps = {
    page: string;
    ownerName: string;
    canCreate: boolean;
    onCreate: () => void;
};

export function WorkspaceHeader({ page, ownerName, canCreate, onCreate }: WorkspaceHeaderProps) {
    return <div className="page-heading"><div><p className="eyebrow">SEU ESPAÇO COMERCIAL</p><h1>{page === 'Meu Dia' ? `Vamos fazer acontecer, ${ownerName.split(' ')[0]}.` : 'Cada oportunidade, um próximo passo.'}</h1><p>{page === 'Meu Dia' ? 'Comece pelas conversas que precisam de você hoje.' : 'Acompanhe a jornada do primeiro contato à conquista.'}</p></div>{canCreate && <button className="primary" onClick={onCreate}>＋ Nova oportunidade</button>}</div>;
}
