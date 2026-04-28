import { auth, authAdmin, db } from "../firebase/config";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

// 1. REGISTRO (Usa instancia secundaria para no cerrar tu sesión)
export const registrarUsuario = async (email, password, rol, restauranteId) => {
  const emailLimpio = email.toLowerCase().trim();
  const userCredential = await createUserWithEmailAndPassword(authAdmin, emailLimpio, password);
  
  await setDoc(doc(db, "usuarios_admin", emailLimpio), {
    email: emailLimpio,
    rol: rol,
    restauranteId: restauranteId,
    fechaRegistro: new Date(),
  });

  await signOut(authAdmin); 
  return userCredential.user;
};

// 2. LOGIN (Lo que Vercel no encontraba)
export const loginUsuario = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const userEmail = userCredential.user.email.toLowerCase().trim();
  const datos = await obtenerDatosUsuario(userEmail);

  if (!datos || !datos.restauranteId) {
    await signOut(auth);
    throw new Error("USUARIO_SIN_PERFIL_CONFIGURADO");
  }

  return {
    user: userCredential.user,
    restauranteId: datos.restauranteId,
    rol: datos.rol,
  };
};

// 3. OBTENER DATOS (Necesario para el login)
export const obtenerDatosUsuario = async (email) => {
  if (!email) return null;
  const emailLimpio = email.toLowerCase().trim();
  const docRef = doc(db, "usuarios_admin", emailLimpio);
  const docSnap = await getDoc(docRef);

  return docSnap.exists() ? docSnap.data() : null;
};

// 4. ESCUCHAR USUARIOS (Para el listado en tiempo real)
export const escucharUsuarios = (restauranteId, callback) => {
  const q = query(
    collection(db, "usuarios_admin"),
    where("restauranteId", "==", restauranteId)
  );

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(data);
  });
};

// 5. LOGOUT
export const logoutUsuario = async () => {
  await signOut(auth);
};