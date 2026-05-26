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
