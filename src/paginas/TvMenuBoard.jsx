import React, { useState, useEffect, useRef } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import "../estilos/tvMenuBoard.css";
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
      {/* 🔘 BOTÓN INTELIGENTE: Cambia dinámicamente de estilo y añade la "✕" al estar en Fullscreen */}
      <button onClick={toggleFullScreen} className="tv-fullscreen-toggle-btn">
        {isFullScreen ? "✕ Salir Vista TV" : "📺 Pantalla Completa"}
      </button>

      {/* HEADER SUPERIOR */}
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

      {/* CUERPO DIVIDIDO */}
      {/* PANEL IZQUIERDO: GRILLA DE 4 TARJETAS CON FOTO DE FONDO Y DESCRIPCIÓN */}
      <main className="tv-board-left-grid-container">
        {productos.length === 0 ? (
          <div className="tv-board-no-products">
            <p>📺 No hay productos autorizados para mostrar en la TV.</p>
            <small>Activa "Mostrar en TV" en el panel de administración.</small>
          </div>
        ) : (
          productos.slice(0, 4).map((p) => (
            <div key={p.id} className="tv-board-product-card">
              {/* 🔥 CORREGIDO: Ahora lee 'imagenUrl' exactamente como está en tu Firestore */}
              {p.imagenUrl && (
                <div className="tv-board-card-bg-image">
                  <img src={p.imagenUrl} alt={p.nombre} />
                  <div className="tv-board-card-gradient-overlay"></div>
                </div>
              )}

              {/* CONTENIDO DE LA TARJETA */}
              <div className="tv-board-card-info-content">
                <div className="tv-board-card-top-row">
                  <h3 className="tv-board-card-title">{p.nombre}</h3>
                  <span className="tv-board-card-price">
                    S/ {Number(p.precio).toFixed(2)}
                  </span>
                </div>

                {/* DESCRIPCIÓN DEL PLATO */}
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
