import React, { useState } from 'react';
import './App.css';
import MenuCliente from './MenuCliente';
import Admin from './Admin';
import Login from './Login';
import { auth } from './firebase';
import { ShoppingCart, Pizza, Coffee, Utensils, Droplet } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [mostrarLogin, setMostrarLogin] = useState(false);

  // Escuchar si el admin inicia sesión
  React.useEffect(() => {
    return onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
    });
  }, []);

  if (mostrarLogin && !user) {
    return <Login alCerrar={() => setMostrarLogin(false)} />;
  }

  return (
    <div className="App">
      {user ? (
        <div className="admin-container">
          <button onClick={() => signOut(auth)} className="btn-logout">Cerrar Sesión</button>
          <Admin />
        </div>
      ) : (
        <div className="cliente-container">
          <MenuCliente esAdmin={false} />
          <button className="admin-access" onClick={() => setMostrarLogin(true)}>
            Acceso Admin
          </button>
        </div>
      )}
    </div>
  );
}

export default App;