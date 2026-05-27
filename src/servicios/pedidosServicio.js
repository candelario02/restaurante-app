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
  itemsPedido = []
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
      // 🔌 EL PUENTE AUTOMÁTICO: Descontar stock del menú del cliente al entregar
      try {
        const pedidoSnap = await getDoc(pedidoRef);

        if (pedidoSnap.exists()) {
          const datosPedido = pedidoSnap.data();
          const itemsComprados =
            datosPedido.items || datosPedido.productos || [];
          for (const item of itemsComprados) {
            if (item.id && item.cantidad > 0) {
              await actualizarStockProductoMenu(
                item.id,
                -Math.abs(item.cantidad),
                restauranteId,
              );
            }
          }
        }
      } catch (stockError) {
        console.error(
          "Error no crítico al descontar stock del menú:",
          stockError,
        );
      }
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
  operadorFirma,
) => {
  const ajuste =
    movimiento.tipo === "salida" ? -movimiento.cantidad : movimiento.cantidad;
  await actualizarStockInventario(restauranteId, item.id, ajuste);
  if (item.producto_menu_id) {
    try {
      const factorStockMenu =
        movimiento.tipo === "entrada"
          ? movimiento.cantidad
          : -movimiento.cantidad;
      await actualizarStockProductoMenu(
        item.producto_menu_id,
        factorStockMenu,
        restauranteId,
      );
    } catch (error) {
      console.error("Error no crítico al sincronizar stock con menú:", error);
    }
  }

  const historialRef = collection(
    db,
    "restaurantes",
    restauranteId,
    "historial_movimientos",
  );
  const hoy = new Date().toLocaleDateString();

  // BUSCAR si ya existe movimiento para este item hoy del mismo tipo e id
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

  const precioUnitarioReal = movimiento.precio || 0;
  const firmaResponsable = operadorFirma || "Operador Anónimo";

  if (docExistente) {
    const data = docExistente.data();
    const nuevaCantidad = data.cantidad + movimiento.cantidad;
    await updateDoc(docExistente.ref, {
      cantidad: nuevaCantidad,
      precio_unitario: precioUnitarioReal,
      total_costo:
        movimiento.tipo !== "transferencia"
          ? nuevaCantidad * precioUnitarioReal
          : 0,
      // Se añade la firma al acumulado del día
      nota: `Operación rápida por: ${firmaResponsable}`,
    });
  } else {
    await addDoc(historialRef, {
      item_id: item.id,
      item_nombre: item.nombre,
      tipo: movimiento.tipo,
      cantidad: movimiento.cantidad,
      precio_unitario: precioUnitarioReal,
      total_costo:
        movimiento.tipo !== "transferencia"
          ? movimiento.cantidad * precioUnitarioReal
          : 0,
      fecha: serverTimestamp(),
      nota: `Operación rápida por: ${firmaResponsable}`, // 👈 Firma estampada en salidas rápidas
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
  operadorFirma,
) => {
  try {
    const insumoRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "insumos",
      insumoId,
    );

    // 1. OBTENER EL STOCK Y PRECIO ACTUAL
    const snapshotOriginal = await getDoc(insumoRef);

    if (snapshotOriginal.exists()) {
      const datosOriginales = snapshotOriginal.data();
      const stockViejo = Number(datosOriginales.stock_actual) || 0;
      const stockNuevo = Number(nuevosDatos.stock_actual) || 0;

      const precioViejo =
        Number(datosOriginales.precio_unitario || datosOriginales.precio) || 0;
      const precioNuevo =
        Number(nuevosDatos.precio_unitario || nuevosDatos.precio) || 0;

      const historialRef = collection(
        db,
        "restaurantes",
        restauranteId,
        "historial_movimientos",
      );
      const firmaResponsable = operadorFirma || "Operador Anónimo";

      // CASO A: SI EL STOCK CAMBIÓ (Es un ajuste manual de inventario)
      if (stockViejo !== stockNuevo) {
        const diferencia = stockNuevo - stockViejo;
        const cantidadAbsoluta = Math.abs(diferencia);

        await addDoc(historialRef, {
          item_id: insumoId,
          item_nombre: nuevosDatos.nombre.trim() || datosOriginales.nombre,
          tipo: "ajuste", // 👈 Candado 1: Tipo neutro exclusivo para auditorías
          cantidad: cantidadAbsoluta,
          precio_unitario: precioNuevo,
          total_costo: 0, // Los ajustes manuales no desglosan costo operativo directo de cocina
          fecha: serverTimestamp(),
          nota: `Ajuste manual por: ${firmaResponsable} (Antes: ${stockViejo} / Ahora: ${stockNuevo})`,
        });
      }
      // CASO B: EL STOCK NO CAMBIÓ, PERO EL PRECIO SÍ CAMBIÓ
      else if (precioViejo !== precioNuevo) {
        await addDoc(historialRef, {
          item_id: insumoId,
          item_nombre: nuevosDatos.nombre.trim() || datosOriginales.nombre,
          tipo: "cambio_precio", // 👈 Candado 2: Rastreabilidad financiera
          cantidad: 0,
          precio_unitario: precioNuevo,
          total_costo: 0,
          fecha: serverTimestamp(),
          nota: `Cambio de precio por: ${firmaResponsable} (De S/. ${precioViejo.toFixed(2)} a S/. ${precioNuevo.toFixed(2)})`,
        });
      }
    }

    // 3. ACTUALIZACIÓN NORMAL EN FIRESTORE
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
