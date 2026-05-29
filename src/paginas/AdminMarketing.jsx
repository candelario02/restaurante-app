import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { guardarMarketingConfig } from "../servicios/productosServicio";
import { subirImagen } from "../servicios/cloudinaryServicio";
import "../estilos/adminMarketing.css";

const AdminMarketing = ({ restauranteId }) => {
  const [config, setConfig] = useState(null);
  const [textoBanner, setTextoBanner] = useState("");
  const [activo, setActivo] = useState(false);
  const [cargandoImagen, setCargandoImagen] = useState(false);
  const [textoAnuncioActual, setTextoAnuncioActual] = useState("");
  const [tiempoRotacion, setTiempoRotacion] = useState(6);

  useEffect(() => {
    if (!restauranteId) return;

    const docRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "configuraciones",
      "datos",
    );
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setConfig(data);
        setTextoBanner(data.textoBanner || "");
        setActivo(data.activo || false);
        setTiempoRotacion(data.tiempoRotacion || 6); // Extraemos el tiempo guardado
      }
    });

    return () => unsubscribe();
  }, [restauranteId]);

  // Guardar configuración global superior (Marquesina y Temporizador)
  const handleGuardarConfigGlobal = async (e) => {
    e.preventDefault();
    if (!restauranteId) return;

    const exito = await guardarMarketingConfig(restauranteId, {
      textoBanner,
      activo,
      tiempoRotacion,
    });
    if (exito) alert("¡Configuración global actualizada con éxito!");
  };

  // Guardar un anuncio nuevo independiente
  const handleSubirPromo = async (e) => {
    const file = e.target.files[0];
    if (!file || !restauranteId) return;

    setCargandoImagen(true);
    try {
      const resCloudinary = await subirImagen(file);
      if (resCloudinary) {
        const anunciosActuales = config?.anuncios || [];
        const nuevoAnuncio = {
          id: Date.now().toString(),
          imagenUrl: resCloudinary.url,
          publicId: resCloudinary.public_id,
          textoPromocional: textoAnuncioActual,
          activo: true, // Por defecto nace encendido
        };

        await guardarMarketingConfig(restauranteId, {
          anuncios: [...anunciosActuales, nuevoAnuncio],
        });

        setTextoAnuncioActual(""); // Limpiamos el input de texto
      }
    } catch (error) {
      console.error("Error al subir anuncio:", error);
    } finally {
      setCargandoImagen(false);
    }
  };

  // Actualizar un campo específico de una tarjeta de anuncio (Texto o Switch de Apagado)
  const handleUpdateAnuncio = async (id, camposActualizados) => {
    if (!restauranteId) return;
    const anunciosActualizados = (config?.anuncios || []).map((anuncio) =>
      anuncio.id === id ? { ...anuncio, ...camposActualizados } : anuncio,
    );

    await guardarMarketingConfig(restauranteId, {
      anuncios: anunciosActualizados,
    });
  };

  // Eliminar tarjeta de anuncio
  const handleEliminarAnuncio = async (idAnuncio) => {
    if (
      !restauranteId ||
      !window.confirm("¿Deseas eliminar de forma permanente esta publicidad?")
    )
      return;

    const anunciosFiltrados = (config?.anuncios || []).filter(
      (a) => a.id !== idAnuncio,
    );
    await guardarMarketingConfig(restauranteId, {
      anuncios: anunciosFiltrados,
    });
  };

  if (!restauranteId) {
    return (
      <div className="admin-mkt-error">
        ⚠️ Error: Falta especificar el ID del restaurante.
      </div>
    );
  }

  if (!config) {
    return (
      <div className="admin-mkt-loading">
        Cargando canales de marketing en tiempo real...
      </div>
    );
  }

  return (
    <div className="admin-mkt-container">
      <header className="admin-mkt-header">
        <h2>Panel de Canales de Marketing</h2>
        <p>
          Establecimiento: <strong>{config.nombre || "Cargando..."}</strong>
        </p>
      </header>

      {/* SECCIÓN SUPERIOR: CONFIGURACIÓN GLOBAL */}
      <form
        onSubmit={handleGuardarConfigGlobal}
        className="admin-mkt-top-panel"
      >
        <div className="admin-mkt-row">
          <div className="admin-mkt-input-group">
            <label>Texto Informativo (Marquesina Inferior)</label>
            <input
              type="text"
              value={textoBanner}
              onChange={(e) => setTextoBanner(e.target.value)}
              placeholder="Escribe las promociones que correrán en el pie de pantalla..."
            />
          </div>

          <div className="admin-mkt-input-group admin-mkt-short">
            <label>Rotación (Segundos)</label>
            <input
              type="number"
              value={tiempoRotacion}
              onChange={(e) => setTiempoRotacion(Number(e.target.value))}
              min="3"
            />
          </div>

          <div className="admin-mkt-input-group admin-mkt-toggle-wrapper">
            <label>Estado en TV</label>
            <button
              type="button"
              className={`admin-mkt-btn-switch ${activo ? "admin-mkt-active" : ""}`}
              onClick={() => setActivo(!activo)}
            >
              {activo ? "🟢 VISIBLE" : "🔴 OCULTO"}
            </button>
          </div>

          <div className="admin-mkt-input-group admin-mkt-action-wrapper">
            <label>&nbsp;</label>
            <button type="submit" className="admin-mkt-btn-primary">
              💾 Guardar Ajustes Globales
            </button>
          </div>
        </div>
      </form>

      {/* SECCIÓN INTERMEDIA: SUBIDA DE PUBLICIDAD */}
      <section className="admin-mkt-upload-panel">
        <h3>🖼️ Agregar Nueva Publicidad Rotativa</h3>
        <div className="admin-mkt-upload-row">
          <input
            type="text"
            value={textoAnuncioActual}
            onChange={(e) => setTextoAnuncioActual(e.target.value)}
            placeholder="Asigna un texto promocional a esta imagen (Ej: ¡Combo Familiar a solo S/ 50!)"
            className="admin-mkt-upload-text"
          />
          <label
            className={`admin-mkt-file-label ${cargandoImagen ? "admin-mkt-disabled" : ""}`}
          >
            {cargandoImagen
              ? "Subiendo..."
              : "➕ Seleccionar e Inyectar Imagen"}
            <input
              type="file"
              accept="image/*"
              onChange={handleSubirPromo}
              disabled={cargandoImagen}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </section>

      {/* SECCIÓN INFERIOR: CUADRÍCULA DE TARJETAS INDEPENDIENTES */}
      <main className="admin-mkt-ads-section">
        <h3>
          Lista de Afiches Activos en Sistema ({config.anuncios?.length || 0})
        </h3>

        <div className="admin-mkt-ads-grid">
          {config.anuncios && config.anuncios.length > 0 ? (
            config.anuncios.map((anuncio) => (
              <div key={anuncio.id} className="admin-mkt-ad-card">
                <div className="admin-mkt-card-image-wrapper">
                  <img src={anuncio.imagenUrl} alt="Publicidad" />
                </div>

                <div className="admin-mkt-card-body">
                  <div className="admin-mkt-card-field">
                    <label>Texto de la Tarjeta:</label>
                    <input
                      type="text"
                      defaultValue={anuncio.textoPromocional}
                      placeholder="Sin descripción promocional"
                      onBlur={(e) =>
                        handleUpdateAnuncio(anuncio.id, {
                          textoPromocional: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="admin-mkt-card-actions">
                    <button
                      type="button"
                      className={`admin-mkt-card-toggle ${anuncio.activo !== false ? "admin-mkt-card-on" : "admin-mkt-card-off"}`}
                      onClick={() =>
                        handleUpdateAnuncio(anuncio.id, {
                          activo: anuncio.activo === false,
                        })
                      }
                    >
                      {anuncio.activo !== false
                        ? "🟢 ACTIVADO"
                        : "🔴 DESACTIVADO"}
                    </button>

                    <button
                      type="button"
                      className="admin-mkt-card-btn-delete"
                      onClick={() => handleEliminarAnuncio(anuncio.id)}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="admin-mkt-fallback">
              <p>No hay afiches publicitarios registrados.</p>
              <small>
                La TV mostrará el logotipo institucional estático por defecto (
                {config.logOut || "Logotipo"}).
              </small>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminMarketing;
