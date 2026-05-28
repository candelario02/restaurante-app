import React, { useState, useEffect, useRef } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import "./tvMenuBoard.css"; // 🔥 Corrección de ruta relativa para que Vercel compile sin caerse

const TvMenuBoard = ({ restauranteId }) => {
  const [productos, setProductos] = useState([]);
  const [nombreLocal, setNombreLocal] = useState("");
  const [marketing, setMarketing] = useState({
    textoBanner: "",
    imagenPublicidad: "",
    activo: false,
  });

  // 🔄 Paginación: 1 solo plato de alto impacto por pantalla
  const [indexActual, setIndexActual] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!restauranteId || restauranteId === "undefined") return;

    // 1. NOMBRE DEL RESTAURANTE
    const datosRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "configuraciones",
      "datos",
    );
    const unsubDatos = onSnapshot(datosRef, (snapshot) => {
      if (snapshot.exists()) {
        setNombreLocal(snapshot.data().nombre || "MENÚ DIGITAL");
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

    // 3. ANUNCIOS Y MARKETING
    const configTvRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "configuraciones",
      "tv",
    );
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

  // 🕒 Rotación automática individual (Estilo cadena de comida rápida)
  useEffect(() => {
    if (productos.length <= 1) {
      setIndexActual(0);
      return;
    }

    const intervalo = setInterval(() => {
      setIndexActual((prev) => (prev + 1) % productos.length);
    }, 7000); // Cambia de plato cada 7 segundos

    return () => clearInterval(intervalo);
  }, [productos]);

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
      {/* 🔘 BOTÓN FLOTANTE INTELIGENTE: Controla el Fullscreen y se adapta visualmente */}
      <button onClick={toggleFullScreen} className="tv-fullscreen-toggle-btn">
        {isFullScreen ? "✕ Salir Vista TV" : "📺 Pantalla Completa"}
      </button>

      {/* HEADER SUPERIOR */}
      <header className="tv-board-header">
        <div className="tv-board-branding">
          <h1>{nombreLocal.toUpperCase()}</h1>
          <span className="tv-board-subtitle">Nuestra Oferta del Día</span>
        </div>
        <div className="tv-board-timer">
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </div>
      </header>

      {/* CUERPO DIVIDIDO */}
      <div className="tv-board-layout-body">
        {/* PANEL IZQUIERDO: UN SOLO PLATO EN FORMATO GIGANTE INMERSIVO */}
        <main className="tv-board-left-panel-premium">
          {!productoActivo ? (
            <div className="tv-board-no-products">
              <p>📺 No hay productos seleccionados para mostrar en la TV.</p>
              <small>Activa "Mostrar en TV" en tus productos.</small>
            </div>
          ) : (
            <div className="tv-board-hero-card">
              {/* FOTO GIGANTE DE FONDO COMPLETO */}
              {productoActivo.imagen && (
                <div className="tv-board-hero-bg-image">
                  <img
                    src={productoActivo.imagen}
                    alt={productoActivo.nombre}
                  />
                  <div className="tv-board-hero-overlay"></div>
                </div>
              )}

              {/* DETALLES DEL PLATO FLOTANTES ABAJO (Igual que en tu imagen de ejemplo) */}
              <div className="tv-board-hero-content-bottom">
                <span className="tv-board-hero-category-badge">
                  {productoActivo.categoria.toUpperCase()}
                </span>
                <div className="tv-board-hero-row">
                  <h2 className="tv-board-hero-name">
                    {productoActivo.nombre}
                  </h2>
                  <span className="tv-board-hero-price">
                    S/ {Number(productoActivo.precio).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* PANEL DERECHO: PUBLICIDAD ADAPTABLE */}
        <aside className="tv-board-right-panel-premium">
          {marketing.activo && marketing.imagenPublicidad ? (
            <div className="tv-marketing-promo-container">
              <img
                src={marketing.imagenPublicidad}
                alt="Promoción del Día"
                className="tv-marketing-img"
              />
            </div>
          ) : (
            <div className="tv-marketing-placeholder-premium">
              <div className="tv-promo-badge-fire">🔥 COMBOS IMPERDIBLES</div>
              <p className="tv-promo-text-main">
                Consulta por nuestras promociones exclusivas pidiendo desde tu
                mesa.
              </p>
              <div className="tv-promo-decor-stars">✨</div>
            </div>
          )}
        </aside>
      </div>

      {/* MARQUESINA INFERIOR */}
      {marketing.activo && marketing.textoBanner && (
        <footer className="tv-board-footer-marquee">
          <div className="tv-marquee-wrapper">
            <p className="tv-marquee-text">
              ✨ {marketing.textoBanner} &nbsp;&nbsp;&nbsp;&nbsp; 🔥{" "}
              {marketing.textoBanner} &nbsp;&nbsp;&nbsp;&nbsp; ✨{" "}
              {marketing.textoBanner}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default TvMenuBoard;
