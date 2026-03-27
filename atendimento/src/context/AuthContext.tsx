/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, getFirestore, onSnapshot, Timestamp } from 'firebase/firestore';
import { auth } from "../services/firebase";
import { ATENDIMENTO_API_BASE_URL } from "../config/functionsApi";

interface UserProfile { 
    createdAt: Timestamp;
    displayName: string;
    email: string;
    setor: string;
    setorNome: string;
    statusConta: boolean;
    updatedAt: Timestamp;
    usuarioID: string;
    emailVerified?: boolean;
}

interface AuthContextType {
    user: User | null;
    profileComplete: boolean;
    checkingProfile: boolean;
    authorized: boolean | null;
    accountDisabled: boolean;
    authDenialReason: string | null;
    loading: boolean;
    logout: () => Promise<void>;
    verifyAuthorization: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileComplete, setProfileComplete] = useState(false);
    const [checkingProfile, setCheckingProfile] = useState(true);
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [accountDisabled, setAccountDisabled] = useState(false);
    const [authDenialReason, setAuthDenialReason] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (usuario) => {
            setUser(usuario);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const checkProfileStatus = async () => {
            if (!user) {
                setProfileComplete(false);
                setCheckingProfile(false);
                // Mantem motivo de bloqueio para exibir na tela de login apos logout.
                return;
            }
            try {
                const db = getFirestore();
                const userDocRef = doc(db, 'usuarios', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                const data = userDocSnap.data() as UserProfile | undefined;

                if (!data) {
                    const message = "Seu email não foi cadastrado no sistema. Entre em contato com o administrador.";
                    localStorage.setItem("authError", message);
                    setAuthDenialReason(message);
                    await signOut(auth);
                    setProfileComplete(false);
                    setCheckingProfile(false);
                    return;
                }

                const isComplete =
                    data.displayName &&
                    data.setor &&
                    (user.emailVerified || data.emailVerified);
                setProfileComplete(!!isComplete);
            } catch {
                await signOut(auth);
                setProfileComplete(false);
            } finally {
                setCheckingProfile(false);
            }
        };
        if (user) {
            setCheckingProfile(true);
            checkProfileStatus();
        }
    }, [user]);

    async function verifyAuthorization(): Promise<boolean> {
        if (!user) return false;
        const token = await user.getIdToken();
        const apiUrl = ATENDIMENTO_API_BASE_URL;

        try {
            const response = await fetch(`${apiUrl}/filaAtendimento`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status === 403) {
                const data = await response.json().catch(() => ({}));
                const message = data.message || "Acesso negado";

                if (import.meta.env.DEV) {
                    console.warn("Acesso bloqueado - Motivo:", message);
                }

                localStorage.setItem("authError", message);

                if (message.includes("desativada")) {
                    setAccountDisabled(true);
                    setAuthDenialReason(message);
                } else {
                    setAuthDenialReason(message);
                }

                return false;
            }

            if (response.status === 200) {
                setAccountDisabled(false);
                setAuthDenialReason(null);
            }

            return response.status === 200;
        } catch (e) {
            if (import.meta.env.DEV) {
                console.error("Falha na verificação de autorização:", e);
            }
            return false;
        }
    }

    useEffect(() => {
        let isMounted = true;
        if (user) {
            verifyAuthorization().then((ok) => {
                if (isMounted) setAuthorized(ok);
                if (!ok) signOut(auth);
            });
        } else {
            setAuthorized(null);
        }
        return () => { isMounted = false; };
    }, [user]);

    useEffect(() => {
        if (user) {
            const db = getFirestore();
            const userDocRef = doc(db, 'usuarios', user.uid);

            // onSnapshot so gera nova leitura quando o documento do usuario muda.
            const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                const userData = docSnap.data() as UserProfile | undefined;

                if (userData && userData.statusConta === false) {
                    const message = "Sua conta foi desativada. Entre em contato com o administrador.";
                    localStorage.setItem("authError", message);
                    setAccountDisabled(true);
                    setAuthDenialReason(message);
                    setAuthorized(false);

                    logout().catch((error) => {
                        if (import.meta.env.DEV) {
                            console.error("Erro ao fazer logout durante desativação:", error);
                        }
                    });
                }
            }, (error) => {
                if (import.meta.env.DEV) {
                    console.error("Erro ao monitorar status da conta:", error);
                }
            });

            const tokenCheckInterval = setInterval(async () => {
                try {
                    await user.getIdToken(true);
                } catch {
                    clearInterval(tokenCheckInterval);
                    logout();
                }
            }, 45 * 60 * 1000);

            return () => {
                unsubscribe();
                clearInterval(tokenCheckInterval);
            };
        }
    }, [user]);

    async function logout() {
        try {
            await signOut(auth);
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error("Erro ao fazer logout:", error);
            }
        }

        setUser(null);
        setProfileComplete(false);
        setAuthorized(false);
    }

    const contextValue = useMemo(() => ({
        user,
        profileComplete,
        checkingProfile,
        authorized,
        accountDisabled,
        authDenialReason,
        loading,
        logout,
        verifyAuthorization,
    }), [user, profileComplete, checkingProfile, authorized, accountDisabled, authDenialReason, loading]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}