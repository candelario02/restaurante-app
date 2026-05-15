import React, { useState, useEffect, useRef } from "react";
import "./estilos/app.css";
import MenuCliente from "./paginas/MenuCliente";
import Admin from "./paginas/Admin";
import Login from "./paginas/Login";
import { auth, db } from "./firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
//para obtener datos de ussuarios y restaurante
import { obtenerDatosUsuario } from "./servicios/usuariosServicio";
import { obtenerConfigRestaurante } from "./servicios/productosServicio";
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
  const [configuracion, setConfiguracion] = useState(null);

  // 🔥 Modifica la inicialización para ser estricto con la URL
  const [restauranteId, setRestauranteId] = useState(() => {
    const pathParts = window.location.pathname.split("/");
    const idDesdeUrl = pathParts[1];

    const reservados = ["login", "admin", "dashboard", ""];

    if (!idDesdeUrl || reservados.includes(idDesdeUrl)) {
      return null;
    }
    return idDesdeUrl;
  });

  // --- REFERENCIAS ---
  const prevPedidosRef = useRef(0);
  const esPrimeraCarga = useRef(true);

  // --- FUNCIONES DE SESIÓN ---
  const cerrarSesion = async () => {
    const idActual = restauranteId;
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
  // 🔥 Sincronizar restauranteId con la URL cuando cambia (navegación manual)
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
  }, [restauranteId]); // dependencia para evitar bucles

  // Autenticación (espera a que restauranteId tenga valor, si es null no hace nada)
  useEffect(() => {
    if (!restauranteId) return; // ← CRÍTICO: si no hay ID, esperar
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setUser(null);
        setRol(null);
        setIsAdmin(false);
        setCargando(false);
        return;
      }
      try {
        const datos = await obtenerDatosUsuario(usuario.email, restauranteId);
        if (datos?.rol) {
          setUser(usuario);
          setRol(datos.rol);
          setIsAdmin(["admin", "superadmin"].includes(datos.rol));
          localStorage.setItem("rolUsuario", datos.rol);
          if (["mozo", "cajero"].includes(datos.rol)) setSeccion("pedidos");
        } else {
          console.warn("Usuario sin permisos en este restaurante");
          await signOut(auth);
        }
      } catch (error) {
        console.error("Error en carga de perfil:", error);
      } finally {
        setCargando(false);
      }
    });
    return () => unsub();
  }, [restauranteId]);

  // Notificaciones (sin cambios)
  useEffect(() => {
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
          audioNotificacion.play().catch(() => {});
        }
        setPedidosPendientes(totalActual);
        prevPedidosRef.current = totalActual;
        esPrimeraCarga.current = false;
      },
      (error) => console.error("Error en Snapshot:", error),
    );
    return () => unsub();
  }, [restauranteId, isAdmin]);

  // Audio (sin cambios)
  useEffect(() => {
    const desbloquear = () => {
      audioNotificacion
        .play()
        .then(() => audioNotificacion.pause())
        .catch(() => {});
      document.removeEventListener("click", desbloquear);
    };
    document.addEventListener("click", desbloquear);
    return () => document.removeEventListener("click", desbloquear);
  }, []);
  //use para cambio de pestanas dinamicas
  useEffect(() => {
    const cargarConfig = async () => {
      if (!restauranteId) return;
      try {
        const datosConfig = await obtenerConfigRestaurante(restauranteId);
        if (datosConfig) {
          setConfiguracion(datosConfig);
          document.title = datosConfig.nombre || "Restaurante";
        }
      } catch (error) {
        console.error("Error cargando configuración:", error);
      }
    };
    cargarConfig();
  }, [restauranteId]);

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
                {configuracion?.nombre
                  ? configuracion.nombre.toUpperCase()
                  : restauranteId
                    ? restauranteId.replace(/_/g, " ").toUpperCase()
                    : "BIENVENIDO"}
              </span>
              {user && (
                <span className="user-welcome">
                  👋 Hola, <strong>{user.email.split("@")[0]}</strong>
                </span>
              )}
            </div>
            {user && restauranteId && isAdmin && (
              <div className="nav-admin-tabs-horizontal">
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
                <button
                  className={`btn-nav-tab ${seccion === "pedidos" ? "active" : ""}`}
                  onClick={() => setSeccion("pedidos")}
                >
                  Pedidos{" "}
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
                <button
                  className="btn-nav-tab"
                  onClick={() => setIsAdmin(!isAdmin)}
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
            <MenuCliente
              restauranteId={restauranteId}
              logoRestaurante={configuracion?.logOut}
              nombreRestaurante={configuracion?.nombre}
            />
          )
        ) : (
          <div className="loading-screen">
            <h2>Bienvenido</h2>
            <p>Por favor, acceda mediante el enlace de su restaurante.</p>
          </div>
        )}
      </main>
      {mostrarLogin && (
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
                setSeccion(r === "mozo" || r === "cajero" ? "pedidos" : "menu");
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
