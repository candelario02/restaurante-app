import { db } from "../firebase/config";

import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  increment,
  query,
  where,
  getFirestore,
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
    const payload = {
      nombre: datosInsumo.nombre.trim(),
      stock_actual: parseInt(datosInsumo.stock_actual, 10) || 0,
      precio_unitario: parseFloat(datosInsumo.precio) || 0, // Nuevo campo
      unidad_medida: datosInsumo.unidad_medida || "kg",
      fechaCreacion: serverTimestamp(),
    };
    const docRef = await addDoc(insumosRef, payload);
    return docRef.id;
  } catch (error) {
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

  // Obtenemos fecha de hoy (sin hora para comparar días)
  const hoy = new Date().toLocaleDateString();

  // 1. BUSCAR si ya existe movimiento para este item hoy
  const q = query(
    historialRef,
    where("item_id", "==", item.id),
    where("tipo", "==", movimiento.tipo),
  );

  const querySnapshot = await getDocs(q);
  let docExistente = null;

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.fecha?.toDate().toLocaleDateString() === hoy) {
      docExistente = doc;
    }
  });

  // 🎯 CORRECCIÓN: Usamos movimiento.precio (el valor real calculado) en vez de item.precio_unitario
  const precioUnitarioReal = movimiento.precio || 0;

  // 2. ACTUALIZAR O CREAR
  if (docExistente) {
    const data = docExistente.data();
    const nuevaCantidad = data.cantidad + movimiento.cantidad;
    await updateDoc(docExistente.ref, {
      cantidad: nuevaCantidad,
      precio_unitario: precioUnitarioReal, // Agregamos el precio unitario para que el historial lo lea
      total_costo:
        movimiento.tipo !== "transferencia"
          ? nuevaCantidad * precioUnitarioReal
          : 0,
    });
  } else {
    await addDoc(historialRef, {
      item_id: item.id,
      item_nombre: item.nombre,
      tipo: movimiento.tipo,
      cantidad: movimiento.cantidad,
      precio_unitario: precioUnitarioReal, // Agregamos el precio unitario para que el historial lo lea
      total_costo:
        movimiento.tipo !== "transferencia"
          ? movimiento.cantidad * precioUnitarioReal
          : 0,
      fecha: serverTimestamp(),
    });
  }
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
//actualizar inventario
export const actualizarDatosInsumo = async (
  restauranteId,
  insumoId,
  nuevosDatos,
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
      nombre: nuevosDatos.nombre.trim(),
      precio_unitario: Number(nuevosDatos.precio_unitario) || 0,
      stock_actual: Number(nuevosDatos.stock_actual) || 0,
      ultimaModificacion: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error en actualizarDatosInsumo:", error);
    throw error;
  }
};
//eliminar insumos
export const eliminarInsumoInventario = async (restauranteId, insumoId) => {
  try {
    const insumoRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "insumos",
      insumoId,
    );
    await deleteDoc(insumoRef);
  } catch (error) {
    console.error("Error en eliminarInsumoInventario:", error);
    throw error;
  }
};
