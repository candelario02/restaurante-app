// src/hooks/useProductos.js
import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  doc,
} from "firebase/firestore";

// ==========================================
// 🧾 PRODUCTOS (VISTA CLIENTE - CON FILTRO)
// ==========================================
export const useProductos = (restauranteId, categoria) => {
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    if (!restauranteId || !categoria) return;

    const q = query(
      collection(db, "productos"),
      where("restauranteId", "==", restauranteId),
      where("categoria", "==", categoria),
      where("disponible", "==", true),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setProductos(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
      );
    });

    return () => unsub();
  }, [restauranteId, categoria]);

  return productos;
};

// ==========================================
// 🛠️ PRODUCTOS (VISTA ADMIN - TODA LA LISTA)
// ==========================================
export const escucharProductos = (restauranteId, callback) => {
  if (!restauranteId) return () => {};

  const q = query(
    collection(db, "productos"),
    where("restauranteId", "==", restauranteId),
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  });
};

// ==========================================
// 📦 PEDIDOS (VISTA ADMIN - TIEMPO REAL)
// ==========================================
export const escucharPedidos = (restauranteId, callback) => {
  if (!restauranteId) return () => {};

  const q = query(
    collection(db, "restaurantes", restauranteId, "pedidos"),
    orderBy("fecha", "desc"),
    limit(25),
  );

  return onSnapshot(q, (snapshot) => {
    const pedidos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(pedidos);
  });
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

// ==========================================
// 👤 USUARIOS (ADMIN)
// ==========================================
export const escucharUsuarios = (restauranteId, callback) => {
  if (!restauranteId) return () => {};

  const q = query(
    collection(db, "usuarios"),
    where("restauranteId", "==", restauranteId),
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  });
};
