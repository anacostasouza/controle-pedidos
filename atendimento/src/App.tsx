import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import React from "react";
import { AuthProvider } from "./context/AuthContext"; // Adicionar esta importação

const Login = React.lazy(() => import("./pages/Login/Login"));
const ProfileEditPage = React.lazy(() => import("./pages/Profile/ProfileEdit"));
const FilaAtendimento = React.lazy(() => import("./pages/Atendimento/FilaAtendimento"));
const DashboardPage = React.lazy(() => import("./pages/Dashboard/Dashboard"));
const Welcome = React.lazy(() => import("./pages/Welcome/Welcome"));

function App() {
  return (
    <AuthProvider> 
      <BrowserRouter>
        <React.Suspense fallback={<div>Carregando...</div>}>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/fila-atendimento"
              element={
                <ProtectedRoute>
                  <FilaAtendimento />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile-edit"
              element={
                <ProtectedRoute>
                  <ProfileEditPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
