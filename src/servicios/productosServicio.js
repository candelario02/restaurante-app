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
  increment,
} from "firebase/firestore";
// 🍔 CREAR PRODUCTO
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
// 📝 ACTUALIZAR PRODUCTO
export const actualizarProducto = async (id, datos, restauranteId) => {
  if (!restauranteId) throw new Error("Falta restauranteId");

  const docRef = doc(db, "restaurantes", restauranteId, "productos", id);

  await updateDoc(docRef, datos);
};
// 🗑️ ELIMINAR PRODUCTO
export const eliminarProducto = async (id, restauranteId) => {
  if (!restauranteId) throw new Error("Falta restauranteId");

  const docRef = doc(db, "restaurantes", restauranteId, "productos", id);

  await deleteDoc(docRef);
};
// ✅ CAMBIAR DISPONIBILIDAD EN EL MENU
export const cambiarDisponibilidad = async (id, estado, restauranteId) => {
  if (!restauranteId) throw new Error("Falta restauranteId");

  const docRef = doc(db, "restaurantes", restauranteId, "productos", id);

  await updateDoc(docRef, { disponible: estado });
};
//✅ CAMBIAR DISPONIBILIDAD EN LA TV
export const cambiarVisibilidadTv = async (
  restauranteId,
  productoId,
  nuevoEstadoTv,
) => {
  if (!restauranteId || !productoId) return;
  try {
    const docRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "productos",
      productoId,
    );
    await updateDoc(docRef, {
      mostrarEnTv: nuevoEstadoTv,
    });
  } catch (error) {
    console.error("Error al cambiar visibilidad de TV:", error);
    throw error;
  }
};
// 🕒 OBTENER PRODUCTOS
export const obtenerProductos = (restauranteId, categoria, callback) => {
  if (!restauranteId) return () => {};

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
//funcion para actualizar ineventario multiple
export const actualizarStockProductoMenu = async (
  productoMenuId,
  cambioCantidad,
  restauranteId,
) => {
  if (!restauranteId)
    throw new Error("Falta restauranteId para actualizar stock");
  if (!productoMenuId) return;

  const docRef = doc(
    db,
    "restaurantes",
    restauranteId,
    "productos",
    productoMenuId,
  );

  await updateDoc(docRef, {
    cantidad: increment(cambioCantidad),
  });
};
//  ⚙️ CONFIG RESTAURANTE
export const obtenerConfigRestaurante = async (restauranteId) => {
  if (!restauranteId) return null;

  try {
    const docRef = doc(
      db,

      "restaurantes",

      restauranteId,

      "configuraciones",

      "datos",
    );

    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.warn("No se encontró el documento de configuración en Firebase");

      return null;
    }
  } catch (error) {
    console.error("Error en obtenerConfigRestaurante:", error);

    return null;
  }
};
