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
    console.error("Error:", error);

    throw error;
  }
};

// Mantener para el Admin (Cambiar a Cocinando/Entregado)

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

    const actualizacion = { estado: nuevoEstado };

    if (nuevoEstado === "entregado") {
      actualizacion.fechaEntrega = serverTimestamp();
    }

    await updateDoc(pedidoRef, actualizacion);
  } catch (error) {
    console.error("Error al actualizar estado:", error);

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
//cerar insumo
export const crearInsumo = async (restauranteId, datosInsumo) => {
  try {
    const insumosRef = collection(db, "restaurantes", restauranteId, "insumos");

    // Normalizamos los datos AQUÍ, no en el componente
    const payload = {
      nombre: datosInsumo.nombre.trim(),
      stock_actual: parseInt(datosInsumo.stock_actual, 10) || 0,
      unidad_medida: datosInsumo.unidad_medida || "kg",
      fechaCreacion: serverTimestamp(),
    };

    const docRef = await addDoc(insumosRef, payload);
    return docRef.id;
  } catch (error) {
    console.error("Error en crearInsumo:", error);
    throw new Error("No se pudo registrar el insumo");
  }
};

// registar hitorial de insumos
export const realizarMovimientoInventario = async (
  restauranteId,
  item,
  movimiento,
) => {
  const ajuste =
    movimiento.tipo === "salida" ? -movimiento.cantidad : movimiento.cantidad;

  await actualizarStockInventario(restauranteId, item.id, ajuste);

  const historialRef = collection(
    db,
    "restaurantes",
    restauranteId,
    "historial_movimientos",
  );
  await addDoc(historialRef, {
    item_id: item.id,
    item_nombre: item.nombre,
    tipo: movimiento.tipo,
    cantidad: movimiento.cantidad,
    fecha: serverTimestamp(),
  });
};

// actualizarStockInsumo
export const actualizarStockInventario = async (
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
    console.error("Error en actualizarStockInventario:", error);
    throw error;
  }
};
