import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const e2eEmail = process.env.E2E_EMAIL || "desenhar@gmail.com";
const e2ePassword = process.env.E2E_PASSWORD || "Senha123!";

const commonEnv = {
  VITE_USE_FIREBASE_EMULATORS: "true",
  VITE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  VITE_FIRESTORE_EMULATOR_HOST: "127.0.0.1",
  VITE_FIRESTORE_EMULATOR_PORT: "8080",
  VITE_FUNCTIONS_TARGET: "emulator",
  VITE_FUNCTIONS_EMULATOR_HOST: "127.0.0.1:9000",
  VITE_E2E: "true",
  VITE_E2E_EMAIL: e2eEmail,
  VITE_E2E_PASSWORD: e2ePassword,
};

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    trace: "retain-on-failure",
  },
  globalSetup: "./global-setup.ts",
  projects: [
    {
      name: "atendimento",
      use: { baseURL: "http://127.0.0.1:5173" },
    },
    {
      name: "controle-pedidos",
      use: { baseURL: "http://127.0.0.1:5174" },
    },
  ],
  webServer: [
    {
      command:
        "npm --prefix functions run build && npx firebase-tools@15.11.0 emulators:start --only auth,firestore,functions --config firebase.e2e.json",
      cwd: repoRoot,
      url: "http://127.0.0.1:4101",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        "npm --prefix atendimento run dev -- --port 5173 --host 127.0.0.1",
      cwd: repoRoot,
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      env: commonEnv,
    },
    {
      command:
        "npm --prefix controle-pedidos run dev -- --port 5174 --host 127.0.0.1",
      cwd: repoRoot,
      url: "http://127.0.0.1:5174",
      reuseExistingServer: true,
      env: commonEnv,
    },
  ],
});
