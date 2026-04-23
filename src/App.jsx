import React, { useState, useEffect } from "react";
import "./estilos/app.css";

import MenuCliente from "./paginas/MenuCliente";
import Admin from "./paginas/Admin";
import Login from "./paginas/Login";

import { auth } from "./firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth";

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(
    localStorage.getItem("esAdmin") === "true",
  );
  const [restauranteId, setRestauranteId] = useState(
    localStorage.getItem("restauranteId"),
  );
  const [rol, setRol] = useState(
    localStorage.getItem("rolUsuario") || "cliente",
  );

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [seccion, setSeccion] = useState("menu");

  // 🔄 Detectar sesión Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      setUser(usuario);

      if (usuario) {
        if (!restauranteId) {
          try {
            const { restauranteId: id, rol: r } = await obtenerDatosUsuario(
              usuario.email,
            );
            setRestauranteId(id);
            setRol(r);
            setIsAdmin(true);
          } catch (error) {
            console.error("Error recuperando perfil:", error);
          }
        }
      } else {
        cerrarSesion();
      }
    });

    return () => unsub();
  }, []);

  // 🚪 Cerrar sesión REAL
  const cerrarSesion = async () => {
    await signOut(auth); // 🔥 importante
    localStorage.clear();

    setUser(null);
    setIsAdmin(false);
    setRestauranteId(null);
    setRol("cliente");
    setSeccion("menu");
  };

  return (
    <div className="App">
      <nav className="top-bar">
        <div className="top-bar-container">
          <div className="brand">
            <span>Jekito Restobar</span>
            {user && isAdmin && (
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

      {/* 🧠 CONTENIDO */}
      <main className="main-content">
        {user && isAdmin ? (
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

      {/* 🔐 MODAL LOGIN */}
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
              onSuccess={({ restauranteId, rol }) => {
                setRestauranteId(restauranteId);
                setRol(rol);
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
