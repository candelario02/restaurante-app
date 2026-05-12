import { auth, authAdmin, db } from "../firebase/config";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

// 1. REGISTRO (Optimizado)
export const registrarUsuario = async (email, password, rol, restauranteId) => {
  if (!restauranteId) throw new Error("Falta restauranteId para registrar");
  const emailLimpio = email.toLowerCase().trim();

  // Usamos authAdmin para no cerrar la sesión del administrador actual
  const userCredential = await createUserWithEmailAndPassword(
    authAdmin,
    emailLimpio,
    password,
  );

  // Guardamos en la ruta profesional: restaurantes > ID > usuarios_admin > EMAIL
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

// 3. OBTENER DATOS (Prioridad: URL > LocalStorage)
export const obtenerDatosUsuario = async (email) => {
  if (!email) return null;
  const emailLimpio = email.toLowerCase().trim();

  // Obtenemos el ID de la URL de forma segura
  const pathSegments = window.location.pathname.split("/");
  const resIdUrl = pathSegments[1];

  const resId =
    resIdUrl && !["login", "admin", ""].includes(resIdUrl)
      ? resIdUrl
      : localStorage.getItem("restauranteId");

  if (resId) {
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

// 4. ESCUCHAR USUARIOS (Tiempo Real)
export const escucharUsuarios = (restauranteId, callback) => {
  if (!restauranteId) return () => {};

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

// 5. ELIMINACIÓN (Limpia)
export const eliminarUsuario = async (email, restauranteId) => {
  if (!restauranteId) throw new Error("Falta restauranteId para eliminar");
  const emailLimpio = email.toLowerCase().trim();

  // Borramos solo de la subcolección del restaurante (donde realmente vive)
  const refSede = doc(
    db,
    "restaurantes",
    restauranteId,
    "usuarios_admin",
    emailLimpio,
  );

  await deleteDoc(refSede);

  // Nota: Si en el futuro agregas una colección global 'usuarios',
  // aquí deberías borrar también esa referencia.
};

// 6. LOGOUT
export const logoutUsuario = async () => {
  await signOut(auth);
};
