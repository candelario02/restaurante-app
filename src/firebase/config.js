// src/firebase/config.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDbhwRwkFdu_2hOLo_0e0jSgDXFx8Azw8Q",
  authDomain: "restaurante-app-4a75c.firebaseapp.com",
  projectId: "restaurante-app-4a75c",
  storageBucket: "restaurante-app-4a75c.appspot.com",
  messagingSenderId: "391265984048",
  appId: "1:391265984048:web:89c671c2dabeb95cded7f5",
  measurementId: "G-YJF0B71MFP"
};

// 1. Inicializar App 
const app = initializeApp(firebaseConfig);

// 2. Inicializar App Secundaria 
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
// Auth Principal (Tu sesión)
export const auth = getAuth(app);

// Auth Administrativo (El "túnel" para crear empleados)
export const authAdmin = getAuth(secondaryApp);

// Persistencia de sesión (Solo para tu cuenta principal)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Persistencia LOCAL activada");
  })
  .catch((error) => {
    console.error("Error en persistencia:", error);
  });

// Firestore (Base de datos compartida)
export const db = getFirestore(app);

// Storage (Archivos compartidos)
export const storage = getStorage(app);