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
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [restauranteId, setRestauranteId] = useState(null);
  const [rol, setRol] = useState(null);

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [seccion, setSeccion] = useState("menu");

  // Estados para notificaciones

  const [pedidosPendientes, setPedidosPendientes] = useState(0);
  const prevPedidosRef = useRef(0);
  const esPrimeraCarga = useRef(true);

  // ✅ LOGICA UNIFICADA: URL + AUTH (Reemplaza los dos primeros useEffect)
  useEffect(() => {
    const ruta = window.location.pathname;
    const idDesdeUrl = ruta.split("/")[1];
    const reservados = ["login", "admin", "dashboard", ""];
    let idDetectadoPorUrl = null;

    if (idDesdeUrl && !reservados.includes(idDesdeUrl)) {
      idDetectadoPorUrl = idDesdeUrl;
      setRestauranteId(idDesdeUrl);
      localStorage.setItem("restauranteId", idDesdeUrl);
    }

    const unsub = onAuthStateChanged(auth, async (usuario) => {
      setCargando(true);

      if (usuario) {
        try {
          const datos = await obtenerDatosUsuario(usuario.email);
          if (datos && datos.restauranteId) {
            setRestauranteId(datos.restauranteId);
            setRol(datos.rol);
            setIsAdmin(datos.rol === "admin" || datos.rol === "superadmin");
            setUser(usuario);
            localStorage.setItem("restauranteId", datos.restauranteId);
            localStorage.setItem("rolUsuario", datos.rol);
          }
        } catch (error) {
          console.error("Error al sincronizar perfil:", error);
        }
      } else {
        // Al no haber usuario, limpiamos datos de sesión
        setUser(null);
        setRol(null);
        setIsAdmin(false);

        if (!idDetectadoPorUrl) {
          setRestauranteId(null);
          localStorage.clear();
        }
      }
      setCargando(false);
    });

    return () => unsub();
  }, []);
  //despierta las otificaiones
  useEffect(() => {
    const desbloquear = () => {
      audioNotificacion
        .play()
        .then(() => {
          audioNotificacion.pause();
          audioNotificacion.currentTime = 0;
          console.log("Canal de audio listo");
        })
        .catch((e) => console.log("Interacción requerida para audio"));
      document.removeEventListener("click", desbloquear);
    };
    document.addEventListener("click", desbloquear);
    return () => document.removeEventListener("click", desbloquear);
  }, []);
  //carga de pedios globales
  useEffect(() => {
    if (!restauranteId || !isAdmin) return;

    const pedidosRef = collection(db, "restaurantes", restauranteId, "pedidos");

    const q = query(pedidosRef, where("estado", "==", "pendiente"));

    const unsub = onSnapshot(q, (snapshot) => {
      const totalActual = snapshot.size;

      if (totalActual > prevPedidosRef.current && !esPrimeraCarga.current) {
        audioNotificacion.pause();
        audioNotificacion.currentTime = 0;
        audioNotificacion.play().catch((error) => {
          console.error("Error de audio:", error);
        });
      }

      setPedidosPendientes(totalActual);
      prevPedidosRef.current = totalActual;
      esPrimeraCarga.current = false;
    });

    return () => unsub();
  }, [restauranteId, isAdmin]);
  // Cerrar sesión REAL
  const cerrarSesion = async () => {
    await signOut(auth);
    localStorage.clear();

    setUser(null);
    setIsAdmin(false);
    setRestauranteId(null);
    setRol("cliente");
    setSeccion("menu");
  };
  if (cargando) {
    return <div className="loading-screen">Sincronizando sesión segura...</div>;
  }
  return (
    <div className="App">
      <nav className="top-bar">
        <div className="top-bar-container">
          <div className="brand">
            <span className="brand-name">
              {restauranteId
                ? restauranteId.replace(/_/g, " ").toUpperCase()
                : "BIENVENIDO"}
            </span>

            {user && isAdmin && restauranteId && (
              <div className="nav-admin-tabs-horizontal">
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
                <button
                  className="btn-nav-tab"
                  onClick={() => setIsAdmin(!isAdmin)}
                >
                  {isAdmin ? "Vista Cliente" : "Panel Control"}
                </button>

                <button className="btn-nav-salir-rojo" onClick={cerrarSesion}>
                  Salir
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* contenido principal */}
      <main className="main-content">
        {isAdmin && restauranteId ? (
          <Admin
            seccion={seccion}
            setSeccion={setSeccion}
            restauranteId={restauranteId}
            rolUsuario={rol}
          />
        ) : (
          <MenuCliente restauranteId={restauranteId} />
        )}
      </main>

      {/* login*/}
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
                localStorage.setItem("restauranteId", id);
                localStorage.setItem("rolUsuario", r);
                localStorage.setItem("esAdmin", "true");

                setRestauranteId(id);
                setRol(r);
                setIsAdmin(true);
                setMostrarLogin(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
