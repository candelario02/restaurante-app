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

// 1. REGISTRO (Optimizado con PIN)
export const registrarUsuario = async (
  email,
  password,
  rol,
  restauranteId,
  pin,
) => {
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
      pin: pin, // 🔥 INYECCIÓN CRÍTICA: Guardamos el PIN en la base de datos
      fechaRegistro: new Date(),
    },
  );

  await signOut(authAdmin);
  return userCredential.user;
};

// 2. LOGIN (Optimizado para validar el PIN del usuario correcto)
export const loginUsuario = async (email, password, restauranteId) => {
  if (!restauranteId) throw new Error("Falta restauranteId para login");

  const userCredential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password,
  );

  const userEmail = userCredential.user.email.toLowerCase().trim();

  const docRef = doc(
    db,
    "restaurantes",
    restauranteId,
    "usuarios_admin",
    userEmail,
  );
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    await signOut(auth);
    throw new Error("USUARIO_SIN_PERFIL_EN_ESTE_RESTAURANTE");
  }

  const data = docSnap.data();

  return {
    user: userCredential.user,
    restauranteId: restauranteId,
    rol: data.rol,
    pinCorrecto: data.pin,
  };
};

// 3. OBTENER DATOS (ahora recibe restauranteId)
export const obtenerDatosUsuario = async (email, restauranteId) => {
  if (!email || !restauranteId) return null;
  const emailLimpio = email.toLowerCase().trim();
  const docRef = doc(
    db,
    "restaurantes",
    restauranteId,
    "usuarios_admin",
    emailLimpio,
  );
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
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
