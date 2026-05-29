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
  const [modoMarquesina, setModoMarquesina] = useState("automatico");
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
        setTiempoRotacion(data.tiempoRotacion || 6);
      }
    });

    return () => unsubscribe();
  }, [restauranteId]);

  // Guardar configuración global superior
  const handleGuardarConfigGlobal = async (e) => {
    e.preventDefault();
    if (!restauranteId) return;

    const exito = await guardarMarketingConfig(restauranteId, {
      textoBanner,
      activo, // ¡Aquí se guarda la variable global que muestra/oculta el panel de la TV!
      tiempoRotacion,
    });
    if (exito) alert("¡Configuración global actualizada y sincronizada en TV!");
  };

  // Subir imagen promocional
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
          activo: true,
        };

        await guardarMarketingConfig(restauranteId, {
          anuncios: [...anunciosActuales, nuevoAnuncio],
        });

        setTextoAnuncioActual("");
      }
    } catch (error) {
      console.error("Error al subir anuncio:", error);
    } finally {
      setCargandoImagen(false);
    }
  };

  // Actualizar tarjeta individual
  const handleUpdateAnuncio = async (id, camposActualizados) => {
    if (!restauranteId) return;
    const anunciosActualizados = (config?.anuncios || []).map((anuncio) =>
      anuncio.id === id ? { ...anuncio, ...camposActualizados } : anuncio,
    );

    await guardarMarketingConfig(restauranteId, {
      anuncios: anunciosActualizados,
    });
  };

  // Eliminar tarjeta
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
        ⚠️ Error crítico: No se ha proporcionado el ID del restaurante.
      </div>
    );
  }

  if (!config) {
    return (
      <div className="admin-mkt-loading">
        ⏳ Sincronizando panel de marketing en tiempo real...
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

      {/* ⚙️ PANEL SUPERIOR: CONFIGURACIÓN GLOBAL */}
      <form
        onSubmit={handleGuardarConfigGlobal}
        className="admin-mkt-top-panel"
      >
        <div className="admin-mkt-row">
          {/* 1. NUEVO: Selector de Modo de Marquesina */}
          <div className="admin-mkt-input-group">
            <label>⚙️ Texto para pie de tv</label>
            <select
              className="admin-mkt-select" /* Puedes reusar estilos de inputs o darle una clase select */
              value={modoMarquesina || "automatico"} // Suponiendo que manejas este estado (automatico / manual)
              onChange={(e) => setModoMarquesina(e.target.value)}
            >
              <option value="automatico">✨ Auto (Textos de Afiches)</option>
              <option value="manual">✍️ Manual (Texto Fijo)</option>
            </select>
          </div>

          {/* 2. MODIFICADO: Input Dinámico Inteligente */}
          <div className="admin-mkt-input-group" style={{ flexGrow: 2 }}>
            <label>📝 Texto Informativo (Marquesina TV)</label>
            <input
              type="text"
              /* Si está en automático, calculamos en tiempo real el texto unido de las tarjetas activas para mostrarlo como preview */
              value={
                modoMarquesina === "automatico"
                  ? (publicidades || [])
                      .filter((a) => a?.visible || a?.estado === "mostrando")
                      .map((a) => a?.texto || "")
                      .filter(Boolean)
                      .join("  •  ") || "Sin afiches activos para mostrar"
                  : textoBanner
              }
              onChange={(e) => {
                if (modoMarquesina === "manual") {
                  setTextoBanner(e.target.value);
                }
              }}
              disabled={
                modoMarquesina === "automatico"
              } /* Se bloquea elegantemente si es automático */
              placeholder={
                modoMarquesina === "automatico"
                  ? "Generando texto desde los afiches activos..."
                  : "Ej: ¡Hoy 2x1 en toda la coctelería!"
              }
              style={{
                opacity: modoMarquesina === "automatico" ? 0.75 : 1,
                cursor:
                  modoMarquesina === "automatico" ? "not-allowed" : "text",
                backgroundColor:
                  modoMarquesina === "automatico" ? "#e2e8f0" : "#f1f5f9",
              }}
            />
          </div>

          {/* 3. IGUAL: Rotación en Segundos */}
          <div className="admin-mkt-input-group">
            <label>⏱️ Rotación (Segundos)</label>
            <input
              type="number"
              value={tiempoRotacion}
              onChange={(e) => setTiempoRotacion(Number(e.target.value))}
              min="3"
            />
          </div>

          {/* 4. IGUAL: Visibilidad Global */}
          <div className="admin-mkt-input-group">
            <label>📺 Visibilidad Global (Panel TV)</label>
            <button
              type="button"
              className={`admin-mkt-btn-switch ${activo ? "admin-mkt-active" : ""}`}
              onClick={() => setActivo(!activo)}
              title="Asegúrate de presionar 'Guardar Ajustes' después de cambiar esto"
            >
              {activo ? "🟢 PANEL VISIBLE" : "🔴 PANEL OCULTO"}
            </button>
          </div>

          {/* 5. IGUAL: Botón Guardar */}
          <div className="admin-mkt-input-group">
            <label>&nbsp;</label>
            <button type="submit" className="admin-mkt-btn-primary">
              💾 Guardar Ajustes
            </button>
          </div>
        </div>
      </form>

      {/* 🖼️ PANEL INTERMEDIO: SUBIDA DE PUBLICIDAD */}
      <section className="admin-mkt-upload-panel">
        <h3>✨ Agregar Nueva Publicidad Rotativa</h3>
        <div className="admin-mkt-upload-row">
          <input
            type="text"
            value={textoAnuncioActual}
            onChange={(e) => setTextoAnuncioActual(e.target.value)}
            placeholder="Asigna un título o texto a la promoción (Opcional)"
            className="admin-mkt-upload-text"
          />
          <label
            className={`admin-mkt-file-label ${cargandoImagen ? "admin-mkt-disabled" : ""}`}
          >
            {cargandoImagen
              ? "⏳ Subiendo e inyectando..."
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

      {/* 🗂️ PANEL INFERIOR: TARJETAS DE ANUNCIOS */}
      <main className="admin-mkt-ads-section">
        <h3>
          Lista de Afiches Activos en Sistema ({config.anuncios?.length || 0})
        </h3>

        <div className="admin-mkt-ads-grid">
          {config.anuncios && config.anuncios.length > 0 ? (
            config.anuncios.map((anuncio) => (
              <div key={anuncio.id} className="admin-mkt-ad-card">
                {/* Badge flotante que indica si se muestra o no */}
                <div
                  className={`admin-mkt-status-badge ${anuncio.activo !== false ? "badge-on" : "badge-off"}`}
                >
                  {anuncio.activo !== false ? "En Pantalla" : "Oculto"}
                </div>

                <div className="admin-mkt-card-image-wrapper">
                  <img src={anuncio.imagenUrl} alt="Publicidad" />
                </div>

                <div className="admin-mkt-card-body">
                  <div className="admin-mkt-card-field">
                    <label>📝 Texto de la Tarjeta:</label>
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
                      {anuncio.activo !== false ? "👁️ MOSTRANDO" : "🙈 OCULTO"}
                    </button>

                    <button
                      type="button"
                      className="admin-mkt-card-btn-delete"
                      onClick={() => handleEliminarAnuncio(anuncio.id)}
                      title="Eliminar permanentemente"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="admin-mkt-fallback">
              <p>No hay afiches publicitarios registrados en este momento.</p>
              <small>
                La TV mostrará automáticamente el logotipo institucional por
                defecto.
              </small>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminMarketing;
