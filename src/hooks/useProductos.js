// hooks/useProductos.js
import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit, // Asegúrate de importar limit
  doc,
} from "firebase/firestore";

// =============================
// 🧾 PRODUCTOS (CLIENTE)
// =============================
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

// =============================
// 📦 PEDIDOS (ADMIN) - TIEMPO REAL
// =============================
export const escucharPedidos = (restauranteId, callback) => {
  if (!restauranteId) return () => {};

  // Usamos la subcolección para mayor orden y velocidad
  const q = query(
    collection(db, "restaurantes", restauranteId, "pedidos"),
    orderBy("fecha", "desc"),
    limit(25),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const pedidos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(pedidos);
    },
    (error) => {
      console.error("Error en Snapshot Pedidos:", error);
    },
  );
};

// =============================
// 👤 USUARIOS (ADMIN)
// =============================
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
