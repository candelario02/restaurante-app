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
      collection(db, "restaurantes", restauranteId, "productos"),

      where("categoria", "==", categoria),

      where("disponible", "==", true),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setProductos(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [restauranteId, categoria]);

  return productos;
};

// ==========================================

// 🛠️ PRODUCTOS (VISTA ADMIN - TODA LA LISTA)

// ==========================================

export const escucharProductosAdmin = (restauranteId, callback) => {
  if (!restauranteId) return () => {};

  const q = query(collection(db, "restaurantes", restauranteId, "productos"));

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  });
};

// 📦 PEDIDOS (VISTA ADMIN - TIEMPO REAL)

export const escucharPedidos = (restauranteId, callback) => {
  if (!restauranteId) return () => {};

  const q = query(
    collection(db, "restaurantes", restauranteId, "pedidos"),

    orderBy("fecha", "desc"),
  );

  return onSnapshot(q, (snapshot) => {
    const pedidos = snapshot.docs.map((doc) => ({
      id: doc.id,

      ...doc.data(),
    }));

    callback(pedidos);
  });
};
// escuchar insumos
export const useInsumos = (restauranteId) => {
  const [insumos, setInsumos] = useState([]);

  useEffect(() => {
    // Aquí es donde usas la función del servicio
    const unsubscribe = escucharInsumosAdmin(restauranteId, (data) => {
      setInsumos(data);
    });
    return () => unsubscribe();
  }, [restauranteId]);

  return insumos;
};
