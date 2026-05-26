import { db } from "../firebase/config";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Agrega un nuevo plato o producto a la carta
 */
export const crearProducto = async (restauranteId, datosProducto) => {
  try {
    const productosRef = collection(
      db,
      "restaurantes",
      restauranteId,
      "productos",
    );
    const docRef = await addDoc(productosRef, {
      ...datosProducto,
      fechaCreacion: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error en crearProducto:", error);
    throw error;
  }
};

/**
 * Modifica datos o stock general del producto final del menú
 */
export const actualizarProducto = async (
  productoId,
  datosActualizados,
  restauranteId,
) => {
  try {
    const productoRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "productos",
      productoId,
    );
    await updateDoc(productoRef, {
      ...datosActualizados,
      ultimaModificacion: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error en actualizarProducto:", error);
    throw error;
  }
};

/**
 * Elimina físicamente un producto de la base de datos
 */
export const eliminarProducto = async (productoId, restauranteId) => {
  try {
    const productoRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "productos",
      productoId,
    );
    await deleteDoc(productoRef);
  } catch (error) {
    console.error("Error en eliminarProducto:", error);
    throw error;
  }
};

/**
 * Cambia de forma rápida si un producto está disponible para la venta o no
 */
export const cambiarDisponibilidad = async (
  productoId,
  disponible,
  restauranteId,
) => {
  try {
    const productoRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "productos",
      productoId,
    );
    await updateDoc(productoRef, { disponible });
  } catch (error) {
    console.error("Error en cambiarDisponibilidad:", error);
    throw error;
  }
};
