import { useState, type ReactNode, useEffect } from 'react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: Readonly<ProtectedRouteProps>) {
  const [User, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div style={{ textAlign: "center", marginTop: "20px", fontFamily: "Comfortaa, sans-serif", fontWeight: 600 }} className="aviso">Carregando...</div>;
  if (!User) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
