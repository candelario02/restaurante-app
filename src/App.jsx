import React, { useState, useEffect } from 'react';
import './estilos/app.css';

import MenuCliente from './paginas/MenuCliente';
import Admin from './paginas/Admin';
import Login from './paginas/Login';

import { auth } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('esAdmin') === 'true');
  const [restauranteId, setRestauranteId] = useState(localStorage.getItem('restauranteId'));
  const [rol, setRol] = useState(localStorage.getItem('rolUsuario') || 'cliente');

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [seccion, setSeccion] = useState('menu');

  // 🔄 Detectar sesión Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
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
    setRol('cliente');
    setSeccion('menu');
  };

  return (
    <div className="App">

      {/* 🔝 NAV */}
      <nav className="top-bar">
        {!user ? (
          <button onClick={() => setMostrarLogin(true)}>
            Admin
          </button>
        ) : (
          <>
            <button onClick={() => setIsAdmin(!isAdmin)}>
              {isAdmin ? "Cliente" : "Panel"}
            </button>

            <button onClick={cerrarSesion}>
              Salir
            </button>
          </>
        )}
      </nav>

      {/* 🧠 CONTENIDO */}
      <main>
        {user && isAdmin ? (
          <Admin
            seccion={seccion}
            restauranteId={restauranteId}
            rolUsuario={rol}
          />
        ) : (
          <MenuCliente restauranteId={restauranteId} />
        )}
      </main>

      {/* 🔐 MODAL LOGIN */}
      {mostrarLogin && (
        <Login
          onClose={() => setMostrarLogin(false)}
          onSuccess={(id) => {
            setRestauranteId(id);
            setIsAdmin(true);
            setMostrarLogin(false);
          }}
        />
      )}

    </div>
  );
}

export default App;