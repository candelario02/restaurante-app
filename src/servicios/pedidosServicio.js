import { db } from "../firebase/config";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

// ✅ 1. Crear pedido en la subcolección del restaurante
export const crearPedido = async (restauranteId, datosPedido) => {
  try {
    const pedidosRef = collection(db, "restaurantes", restauranteId, "pedidos");

    const docRef = await addDoc(pedidosRef, {
      ...datosPedido,
      restauranteId,
      fecha: serverTimestamp(),
      estado: "pendiente",
    });

    return docRef.id;
  } catch (error) {
    console.error("Error en crearPedido:", error);
    throw error;
  }
};

// ✅ 2. Actualizar estado (Cocinando, Entregado, etc.)
export const actualizarEstadoPedido = async (
  restauranteId,
  pedidoId,
  nuevoEstado,
) => {
  try {
    const pedidoRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "pedidos",
      pedidoId,
    );
    await updateDoc(pedidoRef, { estado: nuevoEstado });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    throw error;
  }
};

// ✅ 3. Agregar nuevos productos a un pedido existente
export const agregarItemsAlPedido = async (
  restauranteId,
  pedidoId,
  nuevosItems,
  nuevoTotal,
) => {
  try {
    const pedidoRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "pedidos",
      pedidoId,
    );

    await updateDoc(pedidoRef, {
      items: nuevosItems, 
      total: nuevoTotal,
      fechaActualizacion: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error al añadir items:", error);
    throw error;
  }
};
