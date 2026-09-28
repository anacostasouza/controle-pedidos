import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
export { STAGES, LOSSES, today } from '../../functions/src/crm/domain';
export type { Actor, Client, Company, Opportunity, Role, Settings, Task, Bootstrap, DayData, Detail, History, Page, Row, TaskRow, User } from './contracts';
import type { Page, Role } from './contracts';
const e = import.meta.env;
const FIREBASE_DEFAULTS = {
    apiKey: 'AIzaSyCaN8-T_ukB6y6LYKM1InUaMNeFnGFId_A',
    authDomain: 'gestaopedidos-desenhar.firebaseapp.com',
    projectId: 'gestaopedidos-desenhar',
    appId: '1:997615947205:web:a7d68975346c778d5c0fac',
};
const firebaseConfig = {
    apiKey: e.VITE_FIREBASE_API_KEY || FIREBASE_DEFAULTS.apiKey,
    authDomain: e.VITE_FIREBASE_AUTH_DOMAIN || FIREBASE_DEFAULTS.authDomain,
    projectId: e.VITE_FIREBASE_PROJECT_ID || FIREBASE_DEFAULTS.projectId,
    appId: e.VITE_FIREBASE_APP_ID || FIREBASE_DEFAULTS.appId,
};
export const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const localEmulator = Boolean(e.DEV && e.VITE_USE_FIREBASE_EMULATORS === 'true');
if (localEmulator)
    connectAuthEmulator(auth, `http://${e.VITE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'}`, { disableWarnings: true });
const target = e.DEV && e.VITE_FUNCTIONS_TARGET === 'emulator' ? 'emulator' : 'production';
const project = firebaseConfig.projectId, region = e.VITE_FUNCTIONS_REGION || 'southamerica-east1';
const base = target === 'emulator' ? `http://${e.VITE_FUNCTIONS_EMULATOR_HOST || '127.0.0.1:9000'}/${project}/${region}/crmApi` : `https://${region}-${project}.cloudfunctions.net/crmApi`;
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    if (!auth.currentUser)
        throw new Error('Entre com sua conta para continuar.');
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const value = await res.json().catch(() => ({}));
    if (res.status === 401) {
        await auth.signOut();
        throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }
    if (res.status === 403)
        throw new Error(value.message || 'Você não tem permissão para esta operação.');
    if (!res.ok)
        throw new Error(value.message || `Não foi possível concluir (${res.status}).`);
    return value as T;
}
export async function all<T>(path: string): Promise<T[]> { let offset: number | null = 0; const rows: T[] = []; while (offset !== null) {
    const p: Page<T> = await api(`${path}${path.includes('?') ? '&' : '?'}limit=200&offset=${offset}`);
    rows.push(...p.items);
    offset = p.nextOffset;
} return rows; }
export const money = (cents: number | null | undefined) => cents === null || cents === undefined ? 'Sem valor' : (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const displayDate = (value: string | null) => value ? value.slice(0, 10).split('-').reverse().join('/') : '—';
export const roleLabels: Record<Role, string> = { admin: 'Administrador', coordenacao: 'Coordenação', recepcao: 'Recepção', vendedor: 'Vendedor', orcamentista: 'Orçamentista', leitura: 'Consulta' };
