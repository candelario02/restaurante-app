import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Importamos los "cajones" (componentes)
import Login from './Login';
import Admin from './Admin';
import MenuCliente from './MenuCliente';

function App() {
  const [user, setUser] = useState(null);
  const [verLogin, setVerLogin] = useState(false);

  // Escuchar si el admin inició sesión
  useEffect(() => {
    onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
    });
  }, []);

  return (
    <div className="container">
      {/* Si hay un usuario logueado, muestra el Admin */}
      {user ? (
        <Admin />
      ) : (
        // Si no hay usuario, decide entre Login o Menú Cliente
        verLogin ? (
          <Login alCerrar={() => setVerLogin(false)} />
        ) : (
          <>
            <button className="btn-admin-acceso" onClick={() => setVerLogin(true)}>
              Acceso Admin
            </button>
            <MenuCliente />
          </>
        )
      )}
    </div>
  );
}

export default App;