import React, { useState, useEffect } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import "../estilos/tvMenuBoard.css";

const TvMenuBoard = ({ restauranteId }) => {
  const [productos, setProductos] = useState([]);
  const [nombreLocal, setNombreLocal] = useState("");
  const [marketing, setMarketing] = useState({
    textoBanner: "",
    activo: false,
  });

  useEffect(() => {
    if (!restauranteId || restauranteId === "undefined") return;

    // 1. 🏦 NOMBRE DEL RESTAURANTE (DINÁMICO MULTIPUNTO)
    const datosRef = doc(db, "restaurantes", restauranteId, "configuraciones", "datos");
    const unsubDatos = onSnapshot(datosRef, (snapshot) => {
      if (snapshot.exists()) {
        setNombreLocal(snapshot.data().nombre || "MENÚ DIGITAL");
      }
    });

    // 2. 🎯 PRODUCTOS DISPONIBLES Y AUTORIZADOS PARA LA TV
    const productosRef = collection(db, "restaurantes", restauranteId, "productos");
    const q = query(
      productosRef,
      where("disponible", "==", true),
      where("mostrarEnTv", "==", true)
    );

    const unsubProd = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Filtrado por seguridad de stock si maneja cantidades numéricas
      setProductos(lista.filter((p) => p.cantidad === undefined || Number(p.cantidad) > 0));
    });

    // 3. 📢 MARQUESINA PUBLICITARIA / PROMOCIONES
    const configTvRef = doc(db, "restaurantes", restauranteId, "configuraciones", "tv");
    const unsubTv = onSnapshot(configTvRef, (snapshot) => {
      if (snapshot.exists()) {
        setMarketing(snapshot.data());
      }
    });

    return () => {
      unsubDatos();
      unsubProd();
      unsubTv();
    };
  }, [restauranteId]);

  // Lista de categorías estándar del sistema
  const categorias = ["Comidas", "Entradas", "Bebidas", "Cafetería", "Postres"];

  return (
    <div className="tv-board-main-container">
      {/* HEADER DE ALTO IMPACTO */}
      <header className="tv-board-header">
        <div className="tv-board-branding">
          <h1>{nombreLocal.toUpperCase()}</h1>
          <span className="tv-board-subtitle">Menú del Día en Tiempo Real</span>
        </div>
        <div className="tv-board-timer">
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </div>
      </header>

      {/* GRID PRINCIPAL: RENDERIZA EN TARJETAS HORIZONTALES GRANDES PARA TV */}
      <main className="tv-board-grid">
        {categorias.map((cat) => {
          const filtrados = productos.filter((p) => p.categoria === cat);
          if (filtrados.length === 0) return null;

          return (
            <section key={cat} className="tv-board-section">
              <h2 className="tv-board-category-title">{cat.toUpperCase()}</h2>
              <div className="tv-board-list">
                {filtrados.map((item) => (
                  <div key={item.id} className="tv-board-item-card">
                    {item.imageUrl && (
                      <div className="tv-board-item-img-wrapper">
                        <img src={item.imageUrl} alt={item.nombre} />
                      </div>
                    )}
                    <div className="tv-board-item-details">
                      <div className="tv-board-item-header">
                        <span className="tv-board-item-name">{item.nombre}</span>
                        <span className="tv-board-item-price">S/ {Number(item.precio).toFixed(2)}</span>
                      </div>
                      {item.descripcion && (
                        <p className="tv-board-item-desc">{item.descripcion}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      {/* SECCIÓN DE PROMOCIONES / MARKETING BAJO PANTALLA */}
      {marketing.activo && marketing.textoBanner && (
        <footer className="tv-board-footer-marquee">
          <div className="tv-marquee-wrapper">
            <p className="tv-marquee-text">
              🔥 {marketing.textoBanner} &nbsp;&nbsp;&nbsp;&nbsp; ✨ {marketing.textoBanner} &nbsp;&nbsp;&nbsp;&nbsp; 🔥 {marketing.textoBanner}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default TvMenuBoard;