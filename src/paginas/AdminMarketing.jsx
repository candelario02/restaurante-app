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
    // Si no hay ID dinámico inyectado, aborta para evitar colapsar la app
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
      }
    });

    return () => unsubscribe();
  }, [restauranteId]);

  const handleGuardarMarquesina = async (e) => {
    e.preventDefault();
    if (!restauranteId) return;

    const exito = await guardarMarketingConfig(restauranteId, {
      textoBanner,
      activo,
    });
    if (exito) alert("¡Marquesina actualizada correctamente!");
  };

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
          textoPromocional: textoAnuncioActual, // 🔥 Guardamos el texto específico de este anuncio
        };

        await guardarMarketingConfig(restauranteId, {
          anuncios: [...anunciosActuales, nuevoAnuncio],
          tiempoRotacion: tiempoRotacion, // 🔥 Guardamos el tiempo global de rotación
        });

        setTextoAnuncioActual(""); // Limpiamos el input después de subir
      }
    } catch (error) {
      console.error("Error al subir anuncio:", error);
    } finally {
      setCargandoImagen(false);
    }
  };

  const handleEliminarAnuncio = async (idAnuncio) => {
    if (!restauranteId) return;
    if (!window.confirm("¿Deseas quitar este anuncio de la pantalla de la TV?"))
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
        ⚠️ Error del sistema: Falta especificar el ID del restaurante.
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

      <div className="admin-mkt-grid">
        {/* PANEL IZQUIERDO: TEXTO MARQUESINA */}
        <section className="admin-mkt-card">
          <h3>📢 Banner de Texto Inferior (Marquesina)</h3>
          <form onSubmit={handleGuardarMarquesina}>
            <div className="form-group-switch">
              <label>Mostrar en la TV:</label>
              <button
                type="button"
                className={`btn-switch ${activo ? "active" : ""}`}
                onClick={() => setActivo(!activo)}
              >
                {activo ? "🟢 VISIBLE" : "🔴 OCULTO"}
              </button>
            </div>

            <div className="form-group">
              <label>Tiempo de rotación de anuncios (segundos):</label>
              <input
                type="number"
                value={tiempoRotacion}
                onChange={(e) => setTiempoRotacion(Number(e.target.value))}
                min="3"
              />
            </div>
            <div className="form-group">
              <label>Texto Promocional para la imagen a subir:</label>
              <input
                type="text"
                value={textoAnuncioActual}
                onChange={(e) => setTextoAnuncioActual(e.target.value)}
                placeholder="Ej: ¡Combo Familiar a solo S/ 50!"
              />
            </div>
            <button type="submit" className="btn-primary">
              Actualizar Texto
            </button>
          </form>
        </section>

        {/* PANEL DERECHO: IMÁGENES ROTATIVAS */}
        <section className="admin-mkt-card">
          <h3>🖼️ Galería de Publicidad Rotativa</h3>
          <p className="helper-text">
            Sube imágenes de combos o eventos. Si subes varias, la TV alternará
            su visualización automáticamente.
          </p>

          <div className="upload-zone">
            <label className={`file-label ${cargandoImagen ? "disabled" : ""}`}>
              {cargandoImagen
                ? "Subiendo archivo..."
                : "➕ Cargar Imagen de Publicidad"}
              <input
                type="file"
                accept="image/*"
                onChange={handleSubirPromo}
                disabled={cargandoImagen}
                style={{ display: "none" }}
              />
            </label>
          </div>

          <h4>Lista de Afiches Activos ({config.anuncios?.length || 0})</h4>
          <div className="admin-mkt-preview-list">
            {config.anuncios && config.anuncios.length > 0 ? (
              config.anuncios.map((anuncio) => (
                <div key={anuncio.id} className="admin-mkt-thumb-card">
                  <img src={anuncio.imagenUrl} alt="Publicidad" />
                  <button
                    type="button"
                    className="btn-delete-thumb"
                    onClick={() => handleEliminarAnuncio(anuncio.id)}
                  >
                    Eliminar
                  </button>
                </div>
              ))
            ) : (
              <div className="no-promos-fallback">
                <p>No hay afiches activos.</p>
                <small>
                  La TV mostrará automáticamente la imagen estática
                  institucional por defecto ({config.logOut || "Logotipo"}).
                </small>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminMarketing;
