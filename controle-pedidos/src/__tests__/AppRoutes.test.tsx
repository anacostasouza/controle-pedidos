import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppRoutes from "./AppRoutes";

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, cb: (user: null) => void) => {
    cb(null);
    return () => undefined;
  },
  signOut: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getFirestore: vi.fn(),
}));

vi.mock("../services/firebase", () => ({
  auth: {},
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ accountDisabled: false }),
}));

vi.mock("../pages/Login", () => ({
  default: () => <div>LoginPage</div>,
}));

vi.mock("../pages/ProfileNamePage", () => ({
  default: () => <div>ProfileNamePage</div>,
}));

vi.mock("../pages/Dashboard/Dashboard", () => ({
  default: () => <div>Dashboard</div>,
}));

vi.mock("../pages/NovoPedido", () => ({
  default: () => <div>NovoPedido</div>,
}));

vi.mock("../pages/EditarPedidos/EditarPedido", () => ({
  default: () => <div>EditarPedido</div>,
}));

vi.mock("../pages/ProfileEdit/ProfileEdit", () => ({
  default: () => <div>ProfileEdit</div>,
}));

vi.mock("../pages/Relatorios/Relatorios", () => ({
  default: () => <div>Relatorios</div>,
}));

describe("AppRoutes", () => {
  it("renderiza login quando usuario nao esta autenticado", async () => {
    render(<AppRoutes />);
    expect(await screen.findByText("LoginPage")).toBeInTheDocument();
  });
});
