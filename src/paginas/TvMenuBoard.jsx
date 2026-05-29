import React, { useState, useEffect, useRef, useMemo } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import "../estilos/tvMenuBoard.css";

const TvMenuBoard = ({ restauranteId }) => {
  // 1. ESTADOS
  const [productos, setProductos] = useState([]);
  const [config, setConfig] = useState(null);
  const [indexActual, setIndexActual] = useState(0);
  const [indexPromo, setIndexPromo] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef(null);

  // 2. LÓGICA DE MARQUESINA (Memoizada para evitar errores de render)
  const titulosDinamicos = useMemo(() => {
    if (!config) return "";
    const lista =
      config?.publicidades || config?.anuncios || config?.afiches || [];
    return lista
      .filter((a) => a?.activo !== false) // Solo activos
      .map((a) => a?.textoPromocional || a?.titulo || a?.nombre || "")
      .filter(Boolean)
      .join("  •  ");
  }, [config]);

  // 3. EFECTOS (Datos y Rotación)
  useEffect(() => {
    if (!restauranteId || restauranteId === "undefined") return;

    const datosRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "configuraciones",
      "datos",
    );
    const unsubDatos = onSnapshot(datosRef, (snapshot) => {
      if (snapshot.exists()) setConfig(snapshot.data());
    });

    const productosRef = collection(
      db,
      "restaurantes",
      restauranteId,
      "productos",
    );
    const q = query(
      productosRef,
      where("disponible", "==", true),
      where("mostrarEnTv", "==", true),
    );
    const unsubProd = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProductos(
        lista.filter((p) => p.cantidad === undefined || Number(p.cantidad) > 0),
      );
    });

    return () => {
      unsubDatos();
      unsubProd();
    };
  }, [restauranteId]);

  // Rotación de anuncios
  useEffect(() => {
    if (!config?.anuncios) return;
    const anunciosVisibles = config.anuncios.filter((a) => a.activo !== false);
    if (anunciosVisibles.length <= 1) {
      setIndexPromo(0);
      return;
    }

    const tiempo = (config.tiempoRotacion || 6) * 1000;
    const interval = setInterval(() => {
      setIndexPromo((prev) => (prev + 1) % anunciosVisibles.length);
    }, tiempo);
    return () => clearInterval(interval);
  }, [config]);

  // 4. PANTALLA DE CARGA
  if (!config) {
    return (
      <div className="tv-board-loading-screen">
        <h2>Cargando Jekito...</h2>
      </div>
    );
  }
  return (
    <div ref={containerRef} className="tv-board-main-container">
      {/* 🔘 BOTÓN INTELIGENTE */}
      <button onClick={toggleFullScreen} className="tv-fullscreen-toggle-btn">
        {isFullScreen ? "✕ Salir Vista TV" : "📺 Pantalla Completa"}
      </button>

      {/* HEADER SUPERIOR */}
      <header className="tv-board-header">
        <div className="tv-board-branding">
          <h1>{(config?.nombre || "MENÚ DIGITAL").toUpperCase()}</h1>
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

      {/* CUERPO DIVIDIDO DE LA PANTALLA */}
      <div
        className="tv-board-columns-wrapper"
        style={{ display: "flex", flex: 1, width: "100%", overflow: "hidden" }}
      >
        {/* PANEL IZQUIERDO: GRILLA DE 4 TARJETAS DINÁMICAS POR PÁGINA */}
        <main className="tv-board-left-grid-container" style={{ flex: 1 }}>
          {productos.length === 0 ? (
            <div className="tv-board-no-products">
              <p>📺 No hay productos autorizados para mostrar en la TV.</p>
              <small>
                Activa "Mostrar en TV" en el panel de administración.
              </small>
            </div>
          ) : (
            // Muestra bloques de 4 productos de acuerdo al índice actual
            productos.slice(indexActual, indexActual + 4).map((p) => (
              <div key={p.id} className="tv-board-product-card">
                {p.imagenUrl && (
                  <div className="tv-board-card-bg-image">
                    <img src={p.imagenUrl} alt={p.nombre} />
                    <div className="tv-board-card-gradient-overlay"></div>
                  </div>
                )}

                <div className="tv-board-card-info-content">
                  <div className="tv-board-card-top-row">
                    <h3 className="tv-board-card-title">{p.nombre}</h3>
                    <span className="tv-board-card-price">
                      S/ {Number(p.precio).toFixed(2)}
                    </span>
                  </div>

                  {p.descripcion && (
                    <p className="tv-board-card-description">{p.descripcion}</p>
                  )}

                  {p.categoria && (
                    <span className="tv-board-card-badge">
                      {p.categoria.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </main>

        {/* 🖼️ PANEL DERECHO PREMIUM: PUBLICIDAD ROTATIVA AUTOMÁTICA FILTRADA */}
        <aside className="tv-board-right-panel-premium">
          {anunciosVisibles.length > 0 ? (
            <div className="tv-marketing-promo-container">
              {/* Ajuste de seguridad por si el índice queda fuera de rango temporalmente */}
              {anunciosVisibles[indexPromo] && (
                <>
                  {/* 🔥 EL TEXTO DEL ANUNCIO (Ahora es un bloque independiente arriba) */}
                  {anunciosVisibles[indexPromo].textoPromocional && (
                    <div className="tv-marketing-promo-text-block">
                      <h2 className="tv-marketing-promo-title">
                        {anunciosVisibles[indexPromo].textoPromocional}
                      </h2>
                    </div>
                  )}

                  {/* 🖼️ LA IMAGEN DEL ANUNCIO (Se ajusta abajo automáticamente) */}
                  <div className="tv-marketing-img-wrapper">
                    <img
                      src={anunciosVisibles[indexPromo].imagenUrl}
                      alt="Promoción Activa"
                      className="tv-marketing-img"
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            /* RESPUESTO: LOGO CUANDO NO HAY PUBLICIDADES ACTIVAS */
            <div className="tv-marketing-promo-container">
              <div className="tv-marketing-img-wrapper">
                <img
                  src={config?.logOut || "/logo-placeholder.jpg"}
                  alt="Logo Institucional"
                  className="tv-marketing-img"
                />
              </div>
            </div>
          )}
        </aside>
      </div>

      {config?.activo && (
        <footer className="tv-board-footer-marquee">
          <div className="tv-marquee-wrapper">
            <p className="tv-marquee-text">
              {/* Aquí la lógica está blindada */}
              {config?.modoMarquesina === "automatico"
                ? titulosDinamicos || "Bienvenidos a nuestro establecimiento"
                : config?.textoBanner || "Bienvenidos"}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default TvMenuBoard;
