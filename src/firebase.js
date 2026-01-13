import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDbhwRwkFdu_2hOLo_0e0jSgDXFx8Azw8Q",
  authDomain: "restaurante-app-4a75c.firebaseapp.com",
  projectId: "restaurante-app-4a75c",
  storageBucket: "restaurante-app-4a75c.firebasestorage.app",
  messagingSenderId: "391265984048",
  appId: "1:391265984048:web:89c671c2dabeb95cded7f5",
  measurementId: "G-YJF0B71MFP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);