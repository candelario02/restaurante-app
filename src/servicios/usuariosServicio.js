import { db, auth } from '../firebase/config';
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

// =============================
// 👤 REGISTRAR USUARIO
// =============================
export const registrarUsuario = async (email, password, rol, restauranteId) => {
  const emailLimpio = email.toLowerCase().trim();

  await createUserWithEmailAndPassword(auth, emailLimpio, password);

  await setDoc(doc(db, "usuarios_admin", emailLimpio), {
    email: emailLimpio,
    rol,
    restauranteId
  });
};

// =============================
// 🔐 SUPERADMIN
// =============================
const SUPERADMIN_CONFIG = {
  'huamancarrioncande24@gmail.com': {
    restauranteId: 'restaurante_cande',
    rol: 'superadmin'
  },
  'jec02021994@gmail.com': {
    restauranteId: 'jekito_restobar',
    rol: 'superadmin'
  }
};

// =============================
// 🔑 LOGIN
// =============================
export const loginUsuario = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  const user = userCredential.user;
  const userEmail = user.email.toLowerCase().trim();

  let restauranteId = null;
  let rol = null;

  // 🔥 PRIORIDAD: SUPERADMIN
  if (SUPERADMIN_CONFIG[userEmail]) {
    restauranteId = SUPERADMIN_CONFIG[userEmail].restauranteId;
    rol = 'superadmin';
  } else {
    const q = query(
      collection(db, "usuarios_admin"),
      where("email", "==", userEmail)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const datos = snapshot.docs[0].data();
      restauranteId = datos.restauranteId;
      rol = datos.rol;
    }
  }

  // 🚫 SEGURIDAD
  if (!restauranteId) {
    await signOut(auth);
    throw new Error("NO_AUTORIZADO");
  }

  return { user, restauranteId, rol };
};

// =============================
// 🚪 LOGOUT
// =============================
export const logoutUsuario = async () => {
  await signOut(auth);
};