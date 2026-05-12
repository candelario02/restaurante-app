import { db } from "../firebase/config";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  getDoc,
} from "firebase/firestore";

//Crear producto
export const crearProducto = async (datos, restauranteId) => {
  if (!restauranteId) throw new Error("ID de restaurante no proporcionado");

  const docRef = await addDoc(
    collection(db, "restaurantes", restauranteId, "productos"),
    {
      ...datos,
      disponible: true,
      fechaCreacion: new Date(),
    },
  );
  return docRef.id;
};

// Actualizar producto
export const actualizarProducto = async (id, datos, restauranteId) => {
  const docRef = doc(db, "restaurantes", restauranteId, "productos", id);
  await updateDoc(docRef, datos);
};

export const eliminarProducto = async (id, restauranteId) => {
  if (!restauranteId) throw new Error("Falta restauranteId");

  const docRef = doc(db, "restaurantes", restauranteId, "productos", id);
  await deleteDoc(docRef);
};

export const cambiarDisponibilidad = async (id, estado, restauranteId) => {
  if (!restauranteId) throw new Error("Falta restauranteId");

  const docRef = doc(db, "restaurantes", restauranteId, "productos", id);
  await updateDoc(docRef, { disponible: estado });
};

// Obtener productos en tiempo real
export const obtenerProductos = (restauranteId, categoria, callback) => {
  const q = query(
    collection(db, "restaurantes", restauranteId, "productos"),
    where("categoria", "==", categoria),
    where("disponible", "==", true),
  );

  return onSnapshot(q, (snapshot) => {
    const datos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(datos);
  });
};
// Para el Administrador: Ve todo (Incluso lo no disponible)
export const escucharProductosAdmin = (restauranteId, callback) => {
  const q = query(collection(db, "restaurantes", restauranteId, "productos"));

  return onSnapshot(q, (snapshot) => {
    const datos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(datos);
  });
};

// =============================
//  CONFIG RESTAURANTE
// =============================

export const obtenerConfigRestaurante = async (restauranteId) => {
  const docRef = doc(db, "configuraciones", restauranteId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};
