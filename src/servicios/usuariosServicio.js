import { db, auth } from "../firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

export const registrarUsuario = async (email, password, rol, restauranteId) => {
  const emailLimpio = email.toLowerCase().trim();

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    emailLimpio,
    password,
  );

  await setDoc(doc(db, "usuarios_admin", emailLimpio), {
    email: emailLimpio,
    rol: rol,
    restauranteId: restauranteId,
    fechaRegistro: new Date(),
  });

  return userCredential.user;
};

export const loginUsuario = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

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

export const obtenerDatosUsuario = async (email) => {
  if (!email) return null;
  const emailLimpio = email.toLowerCase().trim();

  const docRef = doc(db, "usuarios_admin", emailLimpio);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  }

  return null;
};

export const logoutUsuario = async () => {
  await signOut(auth);
};
