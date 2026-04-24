import React, { useState, useEffect } from "react";
import "./estilos/app.css";

import MenuCliente from "./paginas/MenuCliente";
import Admin from "./paginas/Admin";
import Login from "./paginas/Login";

import { auth } from "./firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { obtenerDatosUsuario } from "./servicios/usuariosServicio";

function App() {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [restauranteId, setRestauranteId] = useState(null);
  const [rol, setRol] = useState(null);

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [seccion, setSeccion] = useState("menu");
  // cargar datos bd
  useEffect(() => {
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

            localStorage.setItem("rolUsuario", datos.rol);
            localStorage.setItem("restauranteId", datos.restauranteId);
          } else {
            await signOut(auth);
            setUser(null);
          }
        } catch (error) {
          console.error("Error al sincronizar perfil:", error);
          setUser(null);
        }
      } else {
        setUser(null);
        setRestauranteId(null);
        setRol(null);
        setIsAdmin(false);
        localStorage.clear();
      }
      setCargando(false);
    });

    return () => unsub();
  }, []);
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
            <span>
              {restauranteId
                ? restauranteId.replace("_", " ").toUpperCase()
                : "Cargando..."}
            </span>

            {user && isAdmin && restauranteId && (
              <div className="nav-admin-tabs-horizontal">
                <button
                  className={`btn-nav-salir ${seccion === "menu" ? "active" : ""}`}
                  onClick={() => setSeccion("menu")}
                >
                  Menú
                </button>
                <button
                  className={`btn-nav-salir ${seccion === "usuarios" ? "active" : ""}`}
                  onClick={() => setSeccion("usuarios")}
                >
                  Usuarios
                </button>
                <button
                  className={`btn-nav-salir ${seccion === "pedidos" ? "active" : ""}`}
                  onClick={() => setSeccion("pedidos")}
                >
                  Pedidos
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
                  className="btn-nav-salir"
                  onClick={() => setIsAdmin(!isAdmin)}
                >
                  {isAdmin ? "Vista Cliente" : "Panel Control"}
                </button>

                <button className="btn-nav-salir" onClick={cerrarSesion}>
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
