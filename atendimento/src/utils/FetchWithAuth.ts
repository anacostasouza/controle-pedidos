import { getAuth, signOut } from "firebase/auth";

export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");
    const token = await user.getIdToken();

    const headers = {
        ...init.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const response = await fetch(input, { ...init, headers });

    if (response.status === 401 || response.status === 403) {
        await signOut(auth);
        globalThis.location.href = '/';
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    return response;
}
