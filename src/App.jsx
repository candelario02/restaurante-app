import React, { useState, useEffect, useRef } from "react";
import "./estilos/app.css";
import MenuCliente from "./paginas/MenuCliente";
import Admin from "./paginas/Admin";
import Login from "./paginas/Login";
import LoginPin from "./paginas/LoginPin";
import TvMenuBoard from "./paginas/TvMenuBoard";
import AdminMarketing from "./paginas/AdminMarketing";
import { auth, db } from "./firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
//para obtener datos de ussuarios y restaurante
import { obtenerDatosUsuario } from "./servicios/usuariosServicio";
import { obtenerConfigRestaurante } from "./servicios/productosServicio";
import { PERMISOS_ROLES } from "./paginas/Admin"; // Ajusta la ruta si es necesario
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
  const [operador, setOperador] = useState(() => {
    const operadorGuardado = sessionStorage.getItem("operador_sesion_activa");
    return operadorGuardado ? JSON.parse(operadorGuardado) : null;
  });

  // inicialización para ser estricto con la URL
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
    sessionStorage.removeItem("operador_sesion_activa");
    if (idActual) {
      localStorage.setItem("restauranteId", idActual);
      setRestauranteId(idActual);
    }
    setUser(null);
    setOperador(null);
    setIsAdmin(false);
    setRol("cliente");
    setSeccion("menu");
  };
  // 🔥 Sincronizar restauranteId con la URL cuando cambia (navegación manual y soporte PWA)
  useEffect(() => {
    const ruta = window.location.pathname;
    const idDesdeUrl = ruta.split("/")[1];
    const reservados = ["login", "admin", "dashboard", ""];

    // CASO 1: Si hay un ID válido en la URL, sincronizamos normalmente
    if (idDesdeUrl && !reservados.includes(idDesdeUrl)) {
      if (restauranteId !== idDesdeUrl) {
        setRestauranteId(idDesdeUrl);
        localStorage.setItem("restauranteId", idDesdeUrl);
      }
    }
    // CASO 2: Si está en la raíz "/" (pasaría al abrir la PWA desde el icono del celular)
    else if (!idDesdeUrl || idDesdeUrl === "") {
      const ultimoIdGuardado = localStorage.getItem("restauranteId");

      // Si encontramos el último restaurante visitado en este celular, lo restauramos
      if (ultimoIdGuardado && restauranteId !== ultimoIdGuardado) {
        setRestauranteId(ultimoIdGuardado);
        // Reemplazamos la URL visualmente sin recargar la página para que no se quede en la raíz
        window.history.replaceState(null, "", `/${ultimoIdGuardado}`);
      }
    }
  }, [restauranteId]);

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

  // Notificaciones
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

  // Audio
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
      if (!restauranteId) {
        setConfiguracion(null);
        return;
      }
      try {
        // SE ELIMINÓ: setConfiguracion(null) de aquí para evitar el bucle infinito
        const datosConfig = await obtenerConfigRestaurante(restauranteId);

        if (datosConfig) {
          setConfiguracion(datosConfig);

          // 1. Cambia el título de la pestaña
          document.title = datosConfig.nombre || "Restaurante";

          // 2. Cambia el icono de la pestaña dinámicamente
          if (datosConfig.logOut) {
            let link = document.querySelector("link[rel~='icon']");

            if (!link) {
              link = document.createElement("link");
              link.rel = "icon";
              document.head.appendChild(link);
            }

            link.href = `/${datosConfig.logOut.trim()}`;
          }
        }
      } catch (error) {
        console.error("Error cargando configuración:", error);
      }
    };
    cargarConfig();
  }, [restauranteId]);

  // 🔥 Sincroniza automáticamente el operador con sessionStorage cada vez que cambia
  useEffect(() => {
    if (operador) {
      sessionStorage.setItem(
        "operador_sesion_activa",
        JSON.stringify(operador),
      );
    } else {
      sessionStorage.removeItem("operador_sesion_activa");
    }
  }, [operador]);

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
                  👋 Hola,{" "}
                  <strong>
                    {operador?.nombre ||
                      operador?.email?.split("@")[0] ||
                      user.email.split("@")[0]}
                  </strong>
                </span>
              )}
            </div>
            {/* 👑 ADMINISTRADORES: Menú, Usuarios e Inventario */}
            {user && restauranteId && isAdmin && operador && (
              <div className="nav-admin-tabs-horizontal">
                {PERMISOS_ROLES[operador.rol]?.verUsuarios && (
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
                    <button
                      className={`btn-nav-tab ${seccion === "inventario" ? "active" : ""}`}
                      onClick={() => setSeccion("inventario")}
                    >
                      Inventario
                    </button>
                    <button
                      className={`btn-nav-tab ${seccion === "historial" ? "active" : ""}`}
                      onClick={() => setSeccion("historial")}
                    >
                      Historial
                    </button>
                    <button
                      className={`btn-nav-tab ${seccion === "tv" ? "active" : ""}`}
                      onClick={() => setSeccion("tv")}
                    >
                      📺 Tablero TV
                    </button>
                    <button
                      className={`btn-nav-tab ${seccion === "marketing" ? "active" : ""}`}
                      onClick={() => setSeccion("marketing")}
                    >
                      📢 Marketing
                    </button>
                  </>
                )}

                {/* 📋 SECCIÓN: Pedidos */}
                {PERMISOS_ROLES[operador.rol]?.verPedidos && (
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
                )}

                {/* 💰 SECCIÓN: Caja */}
                {PERMISOS_ROLES[operador.rol]?.verCaja && (
                  <button
                    className={`btn-nav-tab ${seccion === "caja" ? "active" : ""}`}
                    onClick={() => setSeccion("caja")}
                  >
                    Caja
                  </button>
                )}
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
                {operador && (
                  <button
                    className="btn-nav-admin"
                    onClick={() => setOperador(null)}
                  >
                    🔒 Cambiar Usuario
                  </button>
                )}
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
            // 🚨 CAPA DE SEGURIDAD PROFESIONAL: Si no hay un operador físico en pantalla, bloqueamos con el teclado PIN
            !operador ? (
              <LoginPin
                restauranteId={restauranteId}
                user={user} // 🔥 INYECCIÓN CRÍTICA: Pasamos el usuario autenticado para personalizar la pantalla
                onConfirmar={(datosEmpleado) => {
                  setOperador(datosEmpleado);

                  // 🚀 Obtiene la sección por defecto de la matriz de configuración
                  const seccionInicial =
                    PERMISOS_ROLES[datosEmpleado.rol]?.seccionDefault ||
                    "pedidos";
                  setSeccion(seccionInicial);
                }}
              />
            ) : // Si ya hay un operador validado por PIN, decidimos qué renderizar:
            /* 📺 INTERCEPCIÓN CRÍTICA: Si el botón presionó "tv", cargamos el JSX de la tele a pantalla completa */
            seccion === "tv" ? (
              <TvMenuBoard restauranteId={restauranteId} />
            ) : seccion === "marketing" ? (
              /* 📢 INTERCEPCIÓN DE MARKETING: Cargamos el panel de control de publicidad */
              <AdminMarketing restauranteId={restauranteId} />
            ) : (
              /* De lo contrario, sigue cargando el panel administrativo normal */
              <Admin
                seccion={seccion}
                setSeccion={setSeccion}
                restauranteId={restauranteId}
                rolUsuario={operador.rol} // 🔥 AQUÍ MANDAMOS EL ROL DEL PIN, NO EL DE FIREBASE
                nombreOperador={operador.email.split("@")[0]} // Para saber quién está operando
                onCambiarUsuario={() => setOperador(null)} // Función callback para cerrar sesión de pantalla
              />
            )
          ) : (
            // Si no es admin (es decir, la vista libre del cliente), carga el menú público directo
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
