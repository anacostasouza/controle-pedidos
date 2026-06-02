import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function waitForEmulator(url: string, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Emuladores nao responderam a tempo.");
}

export default async function globalSetup() {
  await waitForEmulator("http://127.0.0.1:4101/emulators");

  const env = {
    ...process.env,
    FIREBASE_PROJECT_ID: "gestaopedidos-desenhar",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    E2E_EMAIL: process.env.E2E_EMAIL || "desenhar@gmail.com",
    E2E_PASSWORD: process.env.E2E_PASSWORD || "Senha123!",
  };

  execSync("node functions/scripts/seed-emulator.js", {
    cwd: repoRoot,
    stdio: "inherit",
    env,
  });
}
