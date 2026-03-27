/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, getFirestore, Timestamp, onSnapshot } from 'firebase/firestore';
import { auth } from "../services/firebase";
import { CONTROLE_PEDIDOS_API_BASE_URL } from "../config/functionsApi";

const API_URL = CONTROLE_PEDIDOS_API_BASE_URL;

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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
                // Não resetar accountDisabled ou authDenialReason quando user é null
                // (permite que a mensagem persista na tela de login)
                return;
            }
            try {
                const db = getFirestore();
                const userDocRef = doc(db, 'usuarios', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                const data = userDocSnap.data() as UserProfile | undefined;
                
                // Se o usuário não foi pré-cadastrado no sistema
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
        const url = `${API_URL}/dashboard/buscarPedidos?porPagina=1`;

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            
            // Se retornar 403, extrair o motivo
            if (response.status === 403) {
                const data = await response.json().catch(() => ({}));
                const message = data.message || "Acesso negado";
                
                if (import.meta.env.DEV) {
                    console.warn("🔒 Acesso bloqueado - Motivo:", message);
                }
                
                // Salvar no localStorage para persistir após logout
                localStorage.setItem("authError", message);
                
                if (message.includes("desativada")) {
                    setAccountDisabled(true);
                    setAuthDenialReason(message);
                } else {
                    setAuthDenialReason(message);
                }
                
                return false;
            }
            
            // Se autorizado, limpar qualquer motivo de negação anterior
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
            
            // Listener em tempo real - só gera leitura quando há mudanças
            const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                const userData = docSnap.data() as UserProfile | undefined;
                
                // Se encontrou o documento mas statusConta é false
                if (userData && userData.statusConta === false) {
                    const message = "Sua conta foi desativada. Entre em contato com o administrador.";
                    
                    // Salvar no localStorage para persistir após logout
                    localStorage.setItem("authError", message);
                    
                    // Setar os estados
                    setAccountDisabled(true);
                    setAuthDenialReason(message);
                    setAuthorized(false);
                    
                    // Fazer logout (isso vai fazer user = null)
                    logout().catch(err => {
                        if (import.meta.env.DEV) {
                            console.error("Erro ao fazer logout durante desativação:", err);
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
        
        // Limpar estados mantendo a razão da negação se foi por desativação
        setUser(null);
        setProfileComplete(false);
        setAuthorized(false);
        // Não limpar accountDisabled ou authDenialReason se foi por conta desativada
        // Isso permite manter a mensagem visível na tela
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