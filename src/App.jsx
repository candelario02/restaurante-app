import React, { useState, useEffect } from 'react';
import './App.css';
import MenuCliente from './MenuCliente';
import Admin from './Admin';
import Login from './Login';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { LogIn, LogOut, X, Clock } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mensajeBienvenida, setMensajeBienvenida] = useState("");
  const [confirmarSalida, setConfirmarSalida] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (usuario) => {
      if (usuario) {
        const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMensajeBienvenida(`¡Bienvenido Administrador! \n Ingreso: ${hora}`);
        setTimeout(() => setMensajeBienvenida(""), 3000); // Se borra en 3 seg
      }
      setUser(usuario);
    });
  }, []);

  const manejarCerrarSesion = () => {
    signOut(auth);
    setConfirmarSalida(false);
  };

  if (mostrarLogin && !user) {
    return <Login alCerrar={() => setMostrarLogin(false)} />;
  }

  return (
    <div className="App">
      {/* Botón de Ingreso/Salida arriba a la derecha */}
      <div className="top-bar">
        {user ? (
          <button className="btn-top-admin" onClick={() => setConfirmarSalida(true)}>
            <LogOut size={18} /> Salir
          </button>
        ) : (
          <button className="btn-top-login" onClick={() => setMostrarLogin(true)}>
            <LogIn size={18} /> Admin
          </button>
        )}
      </div>

      {/* Mensaje de Bienvenida Central */}
      {mensajeBienvenida && (
        <div className="overlay-msg">
          <div className="msg-box">
            <Clock color="#6366f1" size={40} />
            <p>{mensajeBienvenida}</p>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Salida */}
      {confirmarSalida && (
        <div className="overlay-msg">
          <div className="msg-box modal-confirm">
            <h3>¿Estás seguro de salir?</h3>
            <div className="modal-buttons">
              <button className="btn-no" onClick={() => setConfirmarSalida(false)}>Cancelar</button>
              <button className="btn-yes" onClick={manejarCerrarSesion}>Sí, Salir</button>
            </div>
          </div>
        </div>
      )}

      {user ? (
        <div className="admin-container">
          <Admin />
        </div>
      ) : (
        <div className="cliente-container">
          <MenuCliente esAdmin={false} />
        </div>
      )}
    </div>
  );
}

export default App;