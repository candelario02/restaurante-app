// hooks/useProductos.js
import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
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
// 🧾 PRODUCTOS (ADMIN)
// =============================
export const escucharProductos = (restauranteId, callback) => {
  const q = query(
    collection(db, "productos"),
    where("restauranteId", "==", restauranteId),
  );

  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    );
  });
};

// =============================
// 👤 USUARIOS 

export const escucharUsuarios = (restauranteId, callback) => {
  const q = query(
    collection(db, "usuarios"),
    where("restauranteId", "==", restauranteId),
  );

  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    );
  });
};

// =============================
// 📦 PEDIDOS
// =============================
export const escucharPedidos = (restauranteId, callback) => {
  const q = query(
    collection(db, "pedidos"),
    where("restauranteId", "==", restauranteId),
    orderBy("fecha", "desc"),
  );

  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    );
  });
};
