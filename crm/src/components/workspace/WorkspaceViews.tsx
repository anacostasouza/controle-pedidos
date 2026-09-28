import type { ReactNode } from 'react';
import type { DayData, Page, Row } from '../../services/crmApi';

export function MeuDiaView({ day, children }: { day: DayData; children: ReactNode }) {
    return <div className="workspace-view meu-dia-view" data-day={day.day}>{children}</div>;
}

export function OportunidadesView({ result, children }: { result: Page<Row>; children: ReactNode }) {
    return <div className="workspace-view oportunidades-view" data-total={result.total}>{children}</div>;
}

export function OpportunityBoard({ children }: { children: ReactNode }) {
    return <div className="opportunity-board">{children}</div>;
}
