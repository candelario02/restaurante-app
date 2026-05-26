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

// SOLUCIÓN ÚNICA: Maneja creación y actualización de pedidos
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

// ACTUALIZACIÓN DE ESTADO Y DESCUENTO AUTOMÁTICO EN PEDIDOS DEL CLIENTE
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

    // Si el pedido cambia a entregado, descuenta insumos automáticamente
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
    await batch.commit();
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

// ========================================================
// 🥕 NUEVAS FUNCIONES: GESTIÓN DIRECTA DE LA TABLA INVENTARIO
// ========================================================

/**
 * Crea un insumo o materia prima en la subcolección correspondiente del restaurante
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
 * Actualiza el stock de un insumo usando incrementos atómicos (entradas, mermas o salidas manuales)
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
