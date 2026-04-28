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

  const docRef = await addDoc(collection(db, "productos"), {
    ...datos,
    restauranteId: restauranteId,
    disponible: true,
    fechaCreacion: new Date(),
  });
  return docRef.id;
};

// Actualizar producto
export const actualizarProducto = async (id, datos, restauranteId) => {
  if (!restauranteId)
    throw new Error("Falta restauranteId para validar permisos");

  await updateDoc(doc(db, "productos", id), {
    ...datos,
    restauranteId,
  });
};

export const cambiarDisponibilidad = async (id, estado, restauranteId) => {
  if (!restauranteId)
    throw new Error("Falta restauranteId para validar permisos");

  await updateDoc(doc(db, "productos", id), {
    disponible: estado,
    restauranteId,
  });
};

export const eliminarProducto = async (id) => {
  const docRef = doc(db, "productos", id);
  await deleteDoc(docRef);
};

// Obtener productos en tiempo real
export const obtenerProductos = (restauranteId, categoria, callback) => {
  const q = query(
    collection(db, "productos"),
    where("restauranteId", "==", restauranteId),
    where("categoria", "==", categoria),
    where("disponible", "==", true),
  );

  return onSnapshot(q, (snapshot) => {
    const datos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
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
