// firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/**
 * Configuración Firebase
 * ⚠️ Estas keys son públicas y no representan un riesgo de seguridad
 */
const firebaseConfig = {
  apiKey: "AIzaSyDbhwRwkFdu_2hOLo_0e0jSgDXFx8Azw8Q",
  authDomain: "restaurante-app-4a75c.firebaseapp.com",
  projectId: "restaurante-app-4a75c",
  storageBucket: "restaurante-app-4a75c.appspot.com",
  messagingSenderId: "391265984048",
  appId: "1:391265984048:web:89c671c2dabeb95cded7f5",
  measurementId: "G-YJF0B71MFP"
};

// 🔥 Inicializar Firebase (una sola vez)
const app = initializeApp(firebaseConfig);

// 🔐 Auth
export const auth = getAuth(app);

// 🧠 Persistencia local (para Vercel, tablets, Brave, etc.)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Persistencia de sesión establecida en LOCAL");
  })
  .catch((error) => {
    console.error("Error estableciendo persistencia Auth:", error);
  });

// 🗄️ Firestore
export const db = getFirestore(app);

// 📦 Storage
export const storage = getStorage(app);

export default app;
