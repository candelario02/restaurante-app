import { db } from "../firebase/config";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

// ✅ SOLUCIÓN ÚNICA: Maneja creación y actualización
export const gestionarPedido = async (
  restauranteId,
  datosPedido,
  pedidoId = null,
) => {
  try {
    const pedidosRef = collection(db, "restaurantes", restauranteId, "pedidos");

    if (pedidoId) {
      const pedidoExistenteRef = doc(
        db,
        "restaurantes",
        restauranteId,
        "pedidos",
        pedidoId,
      );
      await updateDoc(pedidoExistenteRef, {
        items: datosPedido.items,
        total: datosPedido.total,
        fechaActualizacion: serverTimestamp(),
      });
      return pedidoId;
    } else {
      const docRef = await addDoc(pedidosRef, {
        ...datosPedido,
        restauranteId,
        fecha: serverTimestamp(),
        estado: "pendiente",
      });
      return docRef.id;
    }
  } catch (error) {
    console.error("Error en la gestión del pedido:", error);
    throw error;
  }
};

// ✅ Mantener para el Admin (Cambiar a Cocinando/Entregado)
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
