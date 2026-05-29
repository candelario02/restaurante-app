import React, { useState, useEffect, useRef, useMemo } from "react";
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
  const [config, setConfig] = useState(null);
  const [productos, setProductos] = useState([]);
  const [indexActual, setIndexActual] = useState(0);
  const [indexPromo, setIndexPromo] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef(null);

  const titulosDinamicos = useMemo(() => {
    if (!config) return "";
    const lista =
      config?.publicidades || config?.anuncios || config?.afiches || [];
    const textosActivos = lista
      .filter((a) => a?.activo !== false)
      .map((a) => a?.textoPromocional || a?.titulo || a?.nombre || "")
      .filter(Boolean);
    if (textosActivos.length === 0) {
      return config.nombre
        ? `✨ BIENVENIDOS A ${config.nombre} ✨`
        : "✨ BIENVENIDOS ✨";
    }
    const textosConFormato = textosActivos.map((t) => `🔥 ${t} 🔥`);
    return textosConFormato.join("  •  ");
  }, [config]);

  // 🔄 Paginación automática para los productos de la izquierda (Opcional si usas indexActual)
  useEffect(() => {
    if (productos.length <= 4) return;
    // Usa el mismo tiempo de rotación que la publicidad (en segundos)
    const tiempoSegundos = config?.tiempoRotacion || 6;
    const intervaloProductos = setInterval(() => {
      setIndexActual((prev) => (prev + 4 >= productos.length ? 0 : prev + 4));
    }, tiempoSegundos * 1000);
    return () => clearInterval(intervaloProductos);
  }, [productos, config?.tiempoRotacion]);

  //usefectt para caragr datos
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

  // 🕒 Rotación automática de la galería de publicidad filtrando solo los ACTIVOS
  useEffect(() => {
    if (!config || !config.anuncios) return;

    const anunciosVisibles = config.anuncios.filter((a) => a.activo !== false);
    if (anunciosVisibles.length <= 1) {
      setIndexPromo(0);
      return;
    }
    const tiempoEnMilisegundos = (config.tiempoRotacion || 6) * 1000;

    const intervaloPromo = setInterval(() => {
      setIndexPromo((prev) => (prev + 1) % anunciosVisibles.length);
    }, tiempoEnMilisegundos);

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

  // 🛑 PANTALLA DE CARGA SEGURA: Evita que el componente intente leer datos inexistentes al arrancar
  if (!config) {
    return (
      <div className="tv-board-loading-screen">
        <h2 className="tv-board-loading-text">
          Conectando con el canal de marketing de Jekito Restobar...
        </h2>
      </div>
    );
  }

  // 🛡️ Una vez cargado "config", procesamos los anuncios que el administrador activó
  const anunciosVisibles = (config.anuncios || []).filter(
    (a) => a.activo !== false,
  );

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
                      {/* Ícono según categoría */}
                      {p.categoria.toLowerCase() === "comidas" && "🍽️ "}
                      {p.categoria.toLowerCase() === "entradas" && "🥗 "}
                      {p.categoria.toLowerCase() === "postres" && "🍰 "}
                      {p.categoria.toLowerCase() === "bebidas" && "🥤 "}
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
