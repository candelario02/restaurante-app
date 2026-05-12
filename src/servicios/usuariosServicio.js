import { auth, authAdmin, db } from "../firebase/config";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

// 1. REGISTRO
export const registrarUsuario = async (email, password, rol, restauranteId) => {
  const emailLimpio = email.toLowerCase().trim();

  const userCredential = await createUserWithEmailAndPassword(
    authAdmin,
    emailLimpio,
    password,
  );

  await setDoc(
    doc(db, "restaurantes", restauranteId, "usuarios_admin", emailLimpio),
    {
      email: emailLimpio,
      rol: rol,
      restauranteId: restauranteId,
      fechaRegistro: new Date(),
    },
  );

  await signOut(authAdmin);
  return userCredential.user;
};

// 2. LOGIN
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

// 3. OBTENER DATOS (Necesario para el login)
export const obtenerDatosUsuario = async (email) => {
  if (!email) return null;
  const emailLimpio = email.toLowerCase().trim();

  const resId =
    localStorage.getItem("restauranteId") ||
    window.location.pathname.split("/")[1];

  if (resId && resId !== "login" && resId !== "admin") {
    const docRef = doc(
      db,
      "restaurantes",
      resId,
      "usuarios_admin",
      emailLimpio,
    );
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
  }

  return null;
};
// 4. ESCUCHAR USUARIOS (Para el listado en tiempo real)
export const escucharUsuarios = (restauranteId, callback) => {
  const q = query(
    collection(db, "restaurantes", restauranteId, "usuarios_admin"),
  );
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(data);
  });
};
//eliminicion
export const eliminarUsuario = async (email, restauranteId) => {
  const emailLimpio = email.toLowerCase().trim();

  const refSede = doc(
    db,
    "restaurantes",
    restauranteId,
    "usuarios_admin",
    emailLimpio,
  );
  await deleteDoc(refSede);

  const refGlobal = doc(db, "usuarios_admin", emailLimpio);
  await deleteDoc(refGlobal);
};

// 5. LOGOUT
export const logoutUsuario = async () => {
  await signOut(auth);
};
