import React, { useState, useEffect } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import "../estilos/tvMenuBoard.css";

const TvMenuBoard = ({ restauranteId }) => {
  const [productos, setProductos] = useState([]);
  const [nombreLocal, setNombreLocal] = useState("");
  const [marketing, setMarketing] = useState({
    textoBanner: "",
    imagenPublicidad: "", // URL de la imagen promocional para el costado
    activo: false,
  });

  // 🔄 Estado para la paginación automática
  const [paginaActual, setPaginaActual] = useState(0);
  const PRODUCTOS_POR_PAGINA = 6; // Cantidad ideal de tarjetas grandes para pantallas 1080p

  useEffect(() => {
    if (!restauranteId || restauranteId === "undefined") return;

    // 1. 🏦 NOMBRE DEL RESTAURANTE
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

    // 2. 🎯 PRODUCTOS DISPONIBLES Y AUTORIZADOS PARA LA TV
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

    // 3. 📢 CONFIGURACIÓN DE TELEVISIÓN / MARKETING LATERAL Y BANNER
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

  // 🕒 EFECTO: Rotación automática de pantallas (Paginación tipo Franquicia)
  useEffect(() => {
    if (productos.length <= PRODUCTOS_POR_PAGINA) {
      setPaginaActual(0);
      return;
    }

    const totalPaginas = Math.ceil(productos.length / PRODUCTOS_POR_PAGINA);

    const intervalo = setInterval(() => {
      setPaginaActual((prev) => (prev + 1) % totalPaginas);
    }, 8000); // ⏱️ Cambia de pantallazo cada 8 segundos automáticamente

    return () => clearInterval(intervalo);
  }, [productos]);

  // Segmentación de productos para la página activa
  const inicio = paginaActual * PRODUCTOS_POR_PAGINA;
  const productosVisibles = productos.slice(
    inicio,
    inicio + PRODUCTOS_POR_PAGINA,
  );

  return (
    <div className="tv-board-main-container">
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

      {/* CONTENEDOR DIVIDIDO: PLATOS (IZQUIERDA) | ANUNCIOS (DERECHA) */}
      <div className="tv-board-layout-body">
        {/* COLUMNA DE PLATOS (70% del ancho) */}
        <main className="tv-board-left-panel">
          {productos.length === 0 ? (
            <div className="tv-board-no-products">
              <p>📺 No hay productos seleccionados para mostrar en la TV.</p>
              <small>Activa "Mostrar en TV" en el inventario.</small>
            </div>
          ) : (
            <div className="tv-board-large-cards-grid">
              {productosVisibles.map((item) => (
                <div key={item.id} className="tv-board-item-card-large">
                  {/* 🔥 CORREGIDO: apuntando a item.imagen */}
                  {item.imagen && (
                    <div className="tv-board-item-img-wrapper-large">
                      <img src={item.imagen} alt={item.nombre} />
                    </div>
                  )}

                  <div className="tv-board-item-details-large">
                    <div className="tv-board-item-header-large">
                      <span className="tv-board-item-name-large">
                        {item.nombre}
                      </span>
                      <span className="tv-board-item-price-large">
                        S/ {Number(item.precio).toFixed(2)}
                      </span>
                    </div>
                    {item.descripcion && (
                      <p className="tv-board-item-desc-large">
                        {item.descripcion}
                      </p>
                    )}
                    <span className="tv-board-item-badge">
                      {item.categoria.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* INDICADOR DE PÁGINAS (Puntitos abajo del panel de platos) */}
          {productos.length > PRODUCTOS_POR_PAGINA && (
            <div className="tv-board-pagination-dots">
              {Array.from({
                length: Math.ceil(productos.length / PRODUCTOS_POR_PAGINA),
              }).map((_, index) => (
                <span
                  key={index}
                  className={`tv-dot ${paginaActual === index ? "active" : ""}`}
                />
              ))}
            </div>
          )}
        </main>

        {/* COLUMNA LATERAL DE MARKETING / ANUNCIOS (30% del ancho) */}
        <aside className="tv-board-right-panel">
          {marketing.activo && marketing.imagenPublicidad ? (
            <div className="tv-marketing-promo-container">
              <img
                src={marketing.imagenPublicidad}
                alt="Promoción del Día"
                className="tv-marketing-img"
              />
            </div>
          ) : (
            <div className="tv-marketing-placeholder">
              <h3>🔥 COMBOS IMPERDIBLES</h3>
              <p>
                Consulta por nuestras promociones exclusivas pidiendo desde tu
                mesa.
              </p>
              <div className="tv-placeholder-decor">✨</div>
            </div>
          )}
        </aside>
      </div>

      {/* MARQUESINA PUBLICITARIA INFERIOR */}
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
