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
const manejarVisibilidadTv = async (id, estadoTvActual, restauranteId) => {
  try {
    const nuevoEstadoTv = !estadoTvActual;

    // Llamamos al servicio importado pasando los parámetros en su orden correcto
    await cambiarVisibilidadTv(restauranteId, id, nuevoEstadoTv);

    Swal.fire({
      title: nuevoEstadoTv ? "Mostrando en TV" : "Oculto de la TV",
      icon: "success",
      timer: 800,
      showConfirmButton: false,
      position: "center",
    });
  } catch (error) {
    Swal.fire("Error", "No se pudo actualizar el estado en la TV", "error");
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
