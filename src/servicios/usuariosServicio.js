import { auth, authAdmin, db } from "../firebase/config";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";

export const registrarUsuario = async (email, password, rol, restauranteId) => {
  const emailLimpio = email.toLowerCase().trim();

  // 1. Usamos authAdmin para que NO te cierre la sesión de Admin actual
  const userCredential = await createUserWithEmailAndPassword(authAdmin, emailLimpio, password);
  
  // 2. Guardamos en Firestore
  await setDoc(doc(db, "usuarios_admin", emailLimpio), {
    email: emailLimpio,
    rol: rol,
    restauranteId: restauranteId,
    fechaRegistro: new Date(),
  });

  await signOut(authAdmin); 

  return userCredential.user;
};

export const escucharUsuarios = (restauranteId, callback) => {
  const q = query(
    collection(db, "usuarios_admin"),
    where("restauranteId", "==", restauranteId)
  );

  return onSnapshot(q, (snapshot) => {
    const usuarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(usuarios);
  });
};