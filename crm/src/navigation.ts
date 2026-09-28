import type { Role } from './services/crmApi';

export type CrmNavigationItem = {
    label: string;
    icon: string;
};

const sharedNavigation: CrmNavigationItem[] = [
    { label: 'Meu Dia', icon: '◷' },
    { label: 'Oportunidades', icon: '▦' },
    { label: 'Clientes', icon: '♙' },
    { label: 'Empresas', icon: '▤' },
];

export function getCrmNavigation(role: Role): CrmNavigationItem[] {
    return role === 'admin'
        ? [...sharedNavigation, { label: 'Relatórios', icon: '▥' }, { label: 'Configurações', icon: '⚙' }]
        : sharedNavigation;
}
