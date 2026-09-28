import type { ReactNode } from 'react';

type OpportunityTab = 'Dados' | 'Acompanhamentos' | 'Negociação' | 'Histórico';

export function OpportunityTabs({ active, pendingCount, onChange, children }: { active: OpportunityTab; pendingCount: number; onChange: (tab: OpportunityTab) => void; children: ReactNode }) {
    return <><div className="tabs">{(['Dados', 'Acompanhamentos', 'Negociação', 'Histórico'] as OpportunityTab[]).map(tab => <button className={active === tab ? 'active' : ''} key={tab} onClick={() => onChange(tab)}>{tab}{tab === 'Acompanhamentos' && <span className="count">{pendingCount}</span>}</button>)}</div>{children}</>;
}
