import { db } from "../firebase/config";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

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

export const actualizarEstadoPedido = async (
  restauranteId,
  pedidoId,
  nuevoEstado,
) => {
  const pedidoRef = doc(db, "restaurantes", restauranteId, "pedidos", pedidoId);
  await updateDoc(pedidoRef, { estado: nuevoEstado });
};
