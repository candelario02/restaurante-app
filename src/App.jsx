import React, { useState, useEffect, useRef } from "react";
import "./estilos/app.css";

// Componentes y Páginas
import MenuCliente from "./paginas/MenuCliente";
import Admin from "./paginas/Admin";
import Login from "./paginas/Login";

// Firebase
import { auth, db } from "./firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";

// Servicios
import { obtenerDatosUsuario } from "./servicios/usuariosServicio";

const audioNotificacion = new Audio("/notificacion.mp3");
function App() {
  // --- ESTADOS ---
  const [user, setUser] = useState(null);
  const [rol, setRol] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [seccion, setSeccion] = useState("menu");
  const [pedidosPendientes, setPedidosPendientes] = useState(0);
  const [urlListo, setUrlListo] = useState(false);
  

  // Inicialización síncrona del ID para evitar el primer render con 'null'
  const [restauranteId, setRestauranteId] = useState(() => {
    return localStorage.getItem("restauranteId") || null;
  });

  // --- REFERENCIAS ---
  const prevPedidosRef = useRef(0);
  const esPrimeraCarga = useRef(true);

  // --- FUNCIONES DE SESIÓN ---
  const limpiarEstadoSesion = () => {
    setUser(null);
    setRol(null);
    setIsAdmin(false);
    setRestauranteId(null);
    localStorage.clear();
  };

  const cerrarSesion = async () => {
    const idActual = restauranteId; // Preservamos el ID para el menú cliente
    await signOut(auth);
    localStorage.clear();

    if (idActual) {
      localStorage.setItem("restauranteId", idActual);
      setRestauranteId(idActual);
    }

    setUser(null);
    setIsAdmin(false);
    setRol("cliente");
    setSeccion("menu");
  };

  // 1. Captura de Identidad desde URL
  useEffect(() => {
    const ruta = window.location.pathname;
    const idDesdeUrl = ruta.split("/")[1];
    const reservados = ["login", "admin", "dashboard", ""];
    if (idDesdeUrl && !reservados.includes(idDesdeUrl)) {
      if (restauranteId !== idDesdeUrl) {
        setRestauranteId(idDesdeUrl);
        localStorage.setItem("restauranteId", idDesdeUrl);
      }
    }
    setUrlListo(true); 
  }, []); 

  // 2. Gestión de Autenticación y Perfil
  useEffect(() => {
    if (!urlListo) return;
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setUser(null);
        setRol(null);
        setIsAdmin(false);
        setCargando(false);
        return;
      }
      try {
        // Importante: usar el restauranteId actual (de la URL)
        const datos = await obtenerDatosUsuario(usuario.email, restauranteId);
        if (datos?.rol) {
          setUser(usuario);
          setRol(datos.rol);
          setIsAdmin(["admin", "superadmin"].includes(datos.rol));
          // No modifiques restauranteId aquí
          localStorage.setItem("rolUsuario", datos.rol);
          if (["mozo", "cajero"].includes(datos.rol)) setSeccion("pedidos");
        } else {
          console.warn("Usuario sin permisos en este restaurante");
          await signOut(auth);
        }
      } catch (error) {
        console.error("Error crítico en carga de perfil:", error);
      } finally {
        setCargando(false);
      }
    });
    return () => unsub();
  }, [urlListo, restauranteId]);

  // 3. Sistema de Notificaciones (Escucha Pedidos Pendientes)
  useEffect(() => {
    // 🛡️ GUARDA PROFESIONAL: Evita errores de Firebase 'undefined' y bucles
    if (!restauranteId || !isAdmin) {
      setPedidosPendientes(0);
      return;
    }

    const pedidosRef = collection(db, "restaurantes", restauranteId, "pedidos");
    const q = query(pedidosRef, where("estado", "==", "pendiente"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const totalActual = snapshot.size;

        if (totalActual > prevPedidosRef.current && !esPrimeraCarga.current) {
          audioNotificacion.pause();
          audioNotificacion.currentTime = 0;
          audioNotificacion
            .play()
            .catch(() => console.log("Interacción requerida"));
        }

        setPedidosPendientes(totalActual);
        prevPedidosRef.current = totalActual;
        esPrimeraCarga.current = false;
      },
      (error) => {
        console.error("Error en Snapshot de pedidos:", error);
      },
    );

    return () => unsub();
  }, [restauranteId, isAdmin]); // Se activa solo cuando el ID y el Rol son válidos

  // 4. Desbloqueo de Canal de Audio (UX)
  useEffect(() => {
    const desbloquear = () => {
      audioNotificacion
        .play()
        .then(() => {
          audioNotificacion.pause();
          audioNotificacion.currentTime = 0;
        })
        .catch(() => {});
      document.removeEventListener("click", desbloquear);
    };
    document.addEventListener("click", desbloquear);
    return () => document.removeEventListener("click", desbloquear);
  }, []);

  if (cargando) {
    return <div className="loading-screen">Sincronizando sesión segura...</div>;
  }
  return (
    <div className="App">
      <nav className="top-bar">
        <div className="top-bar-container">
          <div className="brand">
            <div className="brand-info">
              <span className="brand-name">
                {restauranteId
                  ? restauranteId.replace(/_/g, " ").toUpperCase()
                  : "BIENVENIDO"}
              </span>
              {user && (
                <span className="user-welcome">
                  👋 Hola, <strong>{user.email.split("@")[0]}</strong>
                </span>
              )}
            </div>

            {/* ✅ SOLO MOSTRAR PESTAÑAS SI isAdmin ES TRUE (MODO PANEL) */}
            {user && restauranteId && isAdmin && (
              <div className="nav-admin-tabs-horizontal">
                {/* 🛡️ RESTRICCIÓN DE BOTONES: Solo si el ROL es admin o superadmin */}
                {(rol === "admin" || rol === "superadmin") && (
                  <>
                    <button
                      className={`btn-nav-tab ${seccion === "menu" ? "active" : ""}`}
                      onClick={() => setSeccion("menu")}
                    >
                      Menú
                    </button>
                    <button
                      className={`btn-nav-tab ${seccion === "usuarios" ? "active" : ""}`}
                      onClick={() => setSeccion("usuarios")}
                    >
                      Usuarios
                    </button>
                  </>
                )}

                {/* ✅ ESTOS SIEMPRE LOS VE EL MOZO/CAJERO (DENTRO DEL PANEL) */}
                <button
                  className={`btn-nav-tab ${seccion === "pedidos" ? "active" : ""}`}
                  onClick={() => setSeccion("pedidos")}
                >
                  Pedidos
                  {pedidosPendientes > 0 && (
                    <span className="badge-notificacion">
                      {pedidosPendientes}
                    </span>
                  )}
                </button>
                <button
                  className={`btn-nav-tab ${seccion === "caja" ? "active" : ""}`}
                  onClick={() => setSeccion("caja")}
                >
                  Caja
                </button>
              </div>
            )}
          </div>

          <div className="nav-actions">
            {!user ? (
              <button
                className="btn-nav-admin"
                onClick={() => setMostrarLogin(true)}
              >
                Admin
              </button>
            ) : (
              <>
                {/* ✅ BOTÓN DE VISTA: Ahora está FUERA del condicional de isAdmin para que no desaparezca */}
                <button
                  className="btn-nav-tab"
                  onClick={() => {
                    // Si un mozo vuelve al panel, forzamos sección pedidos
                    if (!isAdmin && (rol === "mozo" || rol === "cajero")) {
                      setSeccion("pedidos");
                    }
                    setIsAdmin(!isAdmin);
                  }}
                >
                  {isAdmin ? "Vista Cliente" : "Volver al Panel"}
                </button>

                <button className="btn-nav-salir-rojo" onClick={cerrarSesion}>
                  Salir
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        {restauranteId ? (
          isAdmin ? (
            <Admin
              seccion={seccion}
              setSeccion={setSeccion}
              restauranteId={restauranteId}
              rolUsuario={rol}
            />
          ) : (
            <MenuCliente restauranteId={restauranteId} />
          )
        ) : (
          <div className="loading-screen">
            <h2>Bienvenido</h2>
            <p>Por favor, acceda mediante el enlace de su restaurante.</p>
          </div>
        )}
      </main>

      {mostrarLogin && urlListo && (
        <div className="login-modal-overlay">
          <div className="login-modal-container">
            <button
              className="btn-cerrar-modal"
              onClick={() => setMostrarLogin(false)}
            >
              ✕
            </button>
            <Login
              onClose={() => setMostrarLogin(false)}
              onSuccess={({ restauranteId: id, rol: r }) => {
                setRestauranteId(id);
                setRol(r);
                setIsAdmin(true);
                if (r === "mozo" || r === "cajero") {
                  setSeccion("pedidos");
                } else {
                  setSeccion("menu");
                }
                setMostrarLogin(false);
              }}
              restauranteId={restauranteId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
