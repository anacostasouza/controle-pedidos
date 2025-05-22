import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCaN8-T_ukB6y6LYKM1InUaMNeFnGFId_A",
  authDomain: "gestaopedidos-desenhar.firebaseapp.com",
  projectId: "gestaopedidos-desenhar",
  storageBucket: "gestaopedidos-desenhar.firebasestorage.app",
  messagingSenderId: "997615947205",
  appId: "1:997615947205:web:a7d68975346c778d5c0fac",
  measurementId: "G-FMKG0YZR2C",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { app, db, auth, provider };
