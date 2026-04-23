import { db } from '../firebase/config';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  getDoc
} from 'firebase/firestore';

// =============================
// 🔥 CRUD PRODUCTOS (ADMIN)
// =============================

// ➕ Crear producto (CORREGIDO: Ahora recibe restauranteId)
export const crearProducto = async (datos, restauranteId) => {
  const docRef = await addDoc(collection(db, "productos"), {
    ...datos,
    restauranteId, // 🔥 Esto es vital para que el plato sea de TU local
    disponible: true,
    fechaCreacion: new Date()
  });
  return docRef.id;
};

// ✏️ Actualizar producto
export const actualizarProducto = async (id, datos) => {
  await updateDoc(doc(db, "productos", id), datos);
};

// ❌ Eliminar producto
export const eliminarProducto = async (id) => {
  await deleteDoc(doc(db, "productos", id));
};

// 🔁 Cambiar disponibilidad
export const cambiarDisponibilidad = async (id, estado) => {
  await updateDoc(doc(db, "productos", id), {
    disponible: estado
  });
};

// =============================
// 👁️ CLIENTE (LECTURA)
// =============================

// 📡 Obtener productos en tiempo real
export const obtenerProductos = (restauranteId, categoria, callback) => {
  const q = query(
    collection(db, "productos"),
    where("restauranteId", "==", restauranteId),
    where("categoria", "==", categoria),
    where("disponible", "==", true)
  );

  return onSnapshot(q, (snapshot) => {
    const datos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(datos);
  });
};

// =============================
// ⚙️ CONFIG RESTAURANTE
// =============================

export const obtenerConfigRestaurante = async (restauranteId) => {
  const docRef = doc(db, "configuraciones", restauranteId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};