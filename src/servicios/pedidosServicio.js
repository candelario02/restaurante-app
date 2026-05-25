import { db } from "../firebase/config";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  increment,
  writeBatch,
} from "firebase/firestore";
// SOLUCIÓN ÚNICA: Maneja creación y actualización
export const gestionarPedido = async (
  restauranteId,
  datosPedido,
  pedidoId = null,
) => {
  try {
    if (pedidoId) {
      const pedidoRef = doc(
        db,
        "restaurantes",
        restauranteId,
        "pedidos",
        pedidoId,
      );
      await setDoc(pedidoRef, {
        ...datosPedido,
        fechaActualizacion: serverTimestamp(),
      });
      return pedidoId;
    } else {
      const pedidosRef = collection(
        db,
        "restaurantes",
        restauranteId,
        "pedidos",
      );
      const docRef = await addDoc(pedidosRef, {
        ...datosPedido,
        restauranteId,
        fecha: serverTimestamp(),
        estado: "pendiente",
      });
      return docRef.id;
    }
  } catch (error) {
    console.error("Error en gestionarPedido:", error);
    throw error;
  }
};
// ACTUALIZACIÓN DE ESTADO
export const actualizarEstadoPedido = async (
  restauranteId,
  pedidoId,
  nuevoEstado,
  itemsPedido = [],
) => {
  try {
    const pedidoRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "pedidos",
      pedidoId,
    );
    const batch = writeBatch(db);

    // Si es entregado, descuenta inventario usando batch
    if (nuevoEstado === "entregado") {
      itemsPedido.forEach((item) => {
        if (item.insumoId) {
          const insumoRef = doc(
            db,
            "restaurantes",
            restauranteId,
            "insumos",
            item.insumoId,
          );
          batch.update(insumoRef, { stock_actual: increment(-item.cantidad) });
        }
      });
    }

    const actualizacion = { estado: nuevoEstado };
    if (nuevoEstado === "entregado")
      actualizacion.fechaEntrega = serverTimestamp();

    batch.update(pedidoRef, actualizacion);
    await batch.commit(); // Ejecuta todo junto
  } catch (error) {
    console.error("Error al actualizar estado e inventario:", error);
    throw error;
  }
};
// Registra la calificación y comentario del cliente
export const enviarResenaPedido = async (
  restauranteId,
  pedidoId,
  calificacion,
  comentario,
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
      rating: calificacion,
      resena: comentario,
      fechaResena: serverTimestamp(),
      finalizadoCliente: true,
    });
  } catch (error) {
    console.error("Error al enviar reseña:", error);
    throw error;
  }
};
