import { db } from "../firebase/config";

import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
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
  datosMovimiento,
) => {
  const { id, esInsumo, nombre } = item;
  const { cantidad, tipo } = datosMovimiento;

  // 1. Calculamos el valor de incremento
  const valor = tipo === "entrada" ? cantidad : -cantidad;

  // 2. Ejecutamos la actualización según el tipo (Insumo vs Producto)
  // Nota: Esto simplifica la lógica del if/else que tenías en el componente
  if (esInsumo) {
    await actualizarStockInsumo(restauranteId, id, valor);
  } else {
    // Si tu servicio de productos ya maneja esto, excelente.
    await actualizarProducto(
      id,
      { stock_actual: increment(valor) },
      restauranteId,
    );
  }

  // 3. Registramos el historial (esto siempre sucede, así que el servicio lo hace por ti)
  await registrarMovimientoHistorial(restauranteId, {
    item_nombre: nombre,
    cantidad: cantidad,
    tipo: tipo,
    fecha: serverTimestamp(),
  });
};

// actualizarStockInsumo
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