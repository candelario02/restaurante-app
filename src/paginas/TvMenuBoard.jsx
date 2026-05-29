import React, { useState, useEffect, useRef } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import "../estilos/tvMenuBoard.css";

const TvMenuBoard = ({ restauranteId }) => {
  const [nombreLocal, setNombreLocal] = useState("");
  const [marketing, setMarketing] = useState({
    textoBanner: "",
    imagenPublicidad: "",
    activo: false,
  });

  // 🔄 Paginación: 1 solo plato de alto impacto por pantalla
  const [productos, setProductos] = useState([]);
  const [config, setConfig] = useState(null); // 🔄 Centraliza nombreLocal, logOut y marketing multipunto
  const [indexActual, setIndexActual] = useState(0);
  const [indexPromo, setIndexPromo] = useState(0); // 🖼️ Índice para rotar las imágenes publicitarias
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!restauranteId || restauranteId === "undefined") return;

    // 1. CONFIGURACIÓN COMPLETA (Nombre, Logo, Marquesina y Anuncios Rotativos)
    const datosRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "configuraciones",
      "datos",
    );
    const unsubDatos = onSnapshot(datosRef, (snapshot) => {
      if (snapshot.exists()) {
        setConfig(snapshot.data());
      }
    });

    // 2. PRODUCTOS AUTORIZADOS PARA LA TV
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
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProductos(
        lista.filter((p) => p.cantidad === undefined || Number(p.cantidad) > 0),
      );
    });

    return () => {
      unsubDatos();
      unsubProd();
    };
  }, [restauranteId]);
  // 🕒 Rotación automática de la galería de publicidad (Panel Derecho)
  useEffect(() => {
    if (!config || !config.anuncios || config.anuncios.length <= 1) {
      setIndexPromo(0);
      return;
    }

    const intervaloPromo = setInterval(() => {
      setIndexPromo((prev) => (prev + 1) % config.anuncios.length);
    }, 6000); // Cambia el afiche publicitario cada 6 segundos

    return () => clearInterval(intervaloPromo);
  }, [config]);

  // 🖥️ Lógica del Manejador de Pantalla Completa Nativo
  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      try {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
        setIsFullScreen(true);
      } catch (err) {
        console.error("Error al activar pantalla completa:", err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  // Escuchar si el usuario sale con la tecla ESC
  useEffect(() => {
    const handleScrenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleScrenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleScrenChange);
  }, []);

  const productoActivo = productos[indexActual];

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
        {/* PANEL IZQUIERDO: GRILLA DE 4 TARJETAS */}
        <main className="tv-board-left-grid-container" style={{ flex: 1 }}>
          {productos.length === 0 ? (
            <div className="tv-board-no-products">
              <p>📺 No hay productos autorizados para mostrar en la TV.</p>
              <small>
                Activa "Mostrar en TV" en el panel de administración.
              </small>
            </div>
          ) : (
            productos.slice(0, 4).map((p) => (
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

        {/* 🖼️ PANEL DERECHO PREMIUM: PUBLICIDAD ROTATIVA AUTOMÁTICA O LOGO RESPUESTO */}
        <aside className="tv-board-right-panel-premium">
          {config?.anuncios && config.anuncios.length > 0 ? (
            <div className="tv-marketing-promo-container">
              <img
                src={config.anuncios[indexPromo].imagenUrl}
                alt="Promoción Activa"
                className="tv-marketing-img"
              />
            </div>
          ) : (
            <div className="tv-marketing-promo-container">
              <img
                src={config?.logOut || "/logo-placeholder.jpg"}
                alt="Logo Institucional"
                className="tv-marketing-img"
              />
            </div>
          )}
        </aside>
      </div>

      {/* MARQUESINA INFERIOR AUTOMÁTICA */}
      {config?.activo && config?.textoBanner && (
        <footer className="tv-board-footer-marquee">
          <div className="tv-marquee-wrapper">
            <p className="tv-marquee-text">
              ✨ {config.textoBanner} &nbsp;&nbsp;&nbsp;&nbsp; 🔥{" "}
              {config.textoBanner} &nbsp;&nbsp;&nbsp;&nbsp; ✨{" "}
              {config.textoBanner}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default TvMenuBoard;
