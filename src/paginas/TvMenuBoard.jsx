import React, { useState, useEffect } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import "./tvMenuBoard.css";

const TvMenuBoard = ({ restauranteId = "jekito_restobar" }) => {
  const [productos, setProductos] = useState([]);
  const [marketing, setMarketing] = useState({
    textoBanner: "",
    activo: false,
  });

  useEffect(() => {
    const productosRef = collection(
      db,
      "restaurantes",
      restauranteId,
      "productos",
    );

    // 🎯 REGLA MULTIPUNTO: Solo trae lo disponible Y autorizado para la TV
    const q = query(
      productosRef,
      where("disponible", "==", true),
      where("mostrarEnTv", "==", true),
    );

    const unsubscribeProductos = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // Filtro de seguridad por stock real
      setProductos(lista.filter((p) => Number(p.cantidad) > 0));
    });

    // Escucha de la marquesina publicitaria inferior
    const configRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "configuracion",
      "tv",
    );
    const unsubscribeMarketing = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) setMarketing(docSnap.data());
    });

    return () => {
      unsubscribeProductos();
      unsubscribeMarketing();
    };
  }, [restauranteId]);

  const categorias = ["Comidas", "Entradas", "Bebidas", "Cafetería", "Postres"];

  return (
    <div className="tv-board-container">
      <header className="tv-header">
        <div className="tv-logo">
          <h1>JEKITO RESTOBAR</h1>
          <span className="tv-tagline">Menú Digital en Tiempo Real</span>
        </div>
        <div className="tv-clock">
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </div>
      </header>

      <main className="tv-grid-layout">
        {categorias.map((cat) => {
          const filtrados = productos.filter((p) => p.categoria === cat);
          if (filtrados.length === 0) return null;

          return (
            <section key={cat} className="tv-category-card">
              <h2 className="tv-category-title">{cat.toUpperCase()}</h2>
              <div className="tv-products-list">
                {filtrados.map((item) => (
                  <div
                    key={item.id}
                    className="tv-product-item animate-fade-in"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.nombre}
                        className="tv-product-img"
                      />
                    )}
                    <div className="tv-product-info">
                      <div className="tv-product-row">
                        <span className="tv-product-name">{item.nombre}</span>
                        <span className="tv-product-price">
                          S/ {Number(item.precio).toFixed(2)}
                        </span>
                      </div>
                      {item.descripcion && (
                        <p className="tv-product-desc">{item.descripcion}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {marketing.activo && marketing.textoBanner && (
        <footer className="tv-marketing-ticker">
          <div className="ticker-wrap">
            <div className="ticker-content">
              {marketing.textoBanner} &nbsp;&nbsp; ✨ &nbsp;&nbsp;{" "}
              {marketing.textoBanner}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default TvMenuBoard;
