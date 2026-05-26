import { db } from "../firebase/config";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
  writeBatch,
} from "firebase/firestore";

// ========================================================
// 📦 GESTIÓN DE PEDIDOS
// ========================================================

/**
 * Crea o actualiza un pedido de manera unificada
 */
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
        restaurantesId: restauranteId, // Mantenemos compatibilidad con tu esquema
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

/**
 * Actualiza el estado del pedido y descuenta insumos automáticamente si pasa a 'entregado'
 */
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
    if (nuevoEstado === "entregado") {
      actualizacion.fechaEntrega = serverTimestamp();
    }

    batch.update(pedidoRef, actualizacion);
    await batch.commit();
  } catch (error) {
    console.error("Error al actualizar estado e inventario:", error);
    throw error;
  }
};

/**
 * Registra la calificación y reseña del cliente final
 */
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

// ========================================================
// 🥕 GESTIÓN DE INVENTARIO E INSUMOS
// ========================================================

/**
 * Crea una materia prima en la subcolección del restaurante
 */
export const crearInsumo = async (restauranteId, datosInsumo) => {
  try {
    const insumosRef = collection(db, "restaurantes", restauranteId, "insumos");
    const docRef = await addDoc(insumosRef, {
      ...datosInsumo,
      fechaCreacion: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error en crearInsumo:", error);
    throw error;
  }
};

/**
 * Ajusta el inventario de un insumo mediante incrementos atómicos positivos o negativos
 */
export const actualizarStockInsumo = async (
  restauranteId,
  insumoId,
  cantidad,
) => {
  try {
    const insumoRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "insumos",
      insumoId,
    );
    await updateDoc(insumoRef, {
      stock_actual: increment(cantidad),
      ultimaModificacion: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error en actualizarStockInsumo:", error);
    throw error;
  }
};
