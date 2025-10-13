/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, getFirestore, Timestamp } from 'firebase/firestore';
import { auth } from "../services/firebase";

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
                return;
            }
            try {
                const db = getFirestore();
                const userDocRef = doc(db, 'usuarios', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                const data = userDocSnap.data() as UserProfile | undefined;
                const isComplete =
                    data &&
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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/criarPedido`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ teste: true }),
        });
        return response.status !== 403;
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

    async function logout() {
        await signOut(auth);
        setUser(null);
        setProfileComplete(false);
        setAuthorized(false);
    }

    const contextValue = useMemo(() => ({
        user,
        profileComplete,
        checkingProfile,
        authorized,
        loading,
        logout,
        verifyAuthorization,
    }), [user, profileComplete, checkingProfile, authorized, loading, logout, verifyAuthorization]);

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