import { initializeApp, getApps, getApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, Timestamp } from "firebase/firestore";
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Protege contra inicialização duplicada (especialmente em dev/hot reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const shouldUseEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";
let emulatorsConnected = false;

if (shouldUseEmulators && !emulatorsConnected) {
  const authHost = import.meta.env.VITE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
  const firestoreHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || "127.0.0.1";
  const firestorePort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080);

  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  connectFirestoreEmulator(db, firestoreHost, firestorePort);
  emulatorsConnected = true;
}

export { app, db, auth, provider, Timestamp };
