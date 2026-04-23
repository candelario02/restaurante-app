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
    const docRef = await addDoc(collection(db, "pedidos"), {
      ...datosPedido,
      restauranteId,
      fecha: serverTimestamp(),
      estado: "pendiente",
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const actualizarEstadoPedido = async (id, estado) => {
  await updateDoc(doc(db, "pedidos", id), { estado });
};
