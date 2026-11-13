import { getApps, initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

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

export const configured = Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const localEmulator = Boolean(e.DEV && e.VITE_USE_FIREBASE_EMULATORS === 'true');
if (localEmulator) {
    connectAuthEmulator(
        auth,
        `http://${e.VITE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'}`,
        { disableWarnings: true }
    );
}

const target =
    e.DEV && e.VITE_FUNCTIONS_TARGET === 'emulator' ? 'emulator' : 'production';
const project = firebaseConfig.projectId;
const region = e.VITE_FUNCTIONS_REGION || 'southamerica-east1';
const base =
    target === 'emulator'
        ? `http://${e.VITE_FUNCTIONS_EMULATOR_HOST || '127.0.0.1:9000'}/${project}/${region}/financialApi`
        : `https://${region}-${project}.cloudfunctions.net/financialApi`;

export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    if (!auth.currentUser) throw new Error('Entre com sua conta para continuar.');
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${base}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
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

/** Formata valor monetário em BRL (valor em unidade real, não centavos) */
export const money = (val: number | null | undefined) =>
    val === null || val === undefined
        ? '—'
        : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

/** Formata data para pt-BR (DD/MM/YYYY) de forma segura */
export const displayDate = (value: string | null | undefined): string => {
    if (!value) return '—';
    const trimmed = String(value).trim();
    if (!trimmed) return '—';
    // Se já estiver no formato brasileiro DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
        return trimmed.slice(0, 10);
    }
    // Extrai YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    // Fallback com Date
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('pt-BR');
    }
    return trimmed;
};

/** Formata data e hora para pt-BR (DD/MM/YYYY às HH:mm) */
export const displayDateTime = (value: string | null | undefined): string => {
    if (!value) return '—';
    const trimmed = String(value).trim();
    if (!trimmed) return '—';
    // Se formato brasileiro com hora DD/MM/YYYY HH:mm:ss
    const brMatch = trimmed.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/);
    if (brMatch) {
        return `${brMatch[1]} às ${brMatch[2]}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
        return trimmed.slice(0, 10);
    }
    // Se formato ISO YYYY-MM-DD HH:mm:ss ou YYYY-MM-DDTHH:mm:ss
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]} às ${isoMatch[4]}:${isoMatch[5]}`;
    }
    const isoOnlyDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoOnlyDate) {
        return `${isoOnlyDate[3]}/${isoOnlyDate[2]}/${isoOnlyDate[1]}`;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
        return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return displayDate(trimmed);
};
