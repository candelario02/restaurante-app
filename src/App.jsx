import React, { useState, useEffect } from 'react';
import './App.css';
import MenuCliente from './MenuCliente';
import Admin from './Admin';
import Login from './Login';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { LogIn, LogOut, Settings, Utensils, Clock, ArrowLeft } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mensajeBienvenida, setMensajeBienvenida] = useState("");
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [vistaAdmin, setVistaAdmin] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (usuario) => {
      if (usuario) {
        const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMensajeBienvenida(`¡Bienvenido Administrador! \n Ingreso: ${hora}`);
        setTimeout(() => setMensajeBienvenida(""), 3000);
      } else {
        setVistaAdmin(false);
      }
      setUser(usuario);
    });
  }, []);

  const manejarCerrarSesion = () => {
    signOut(auth);
    setConfirmarSalida(false);
  };

  return (
    <div className="App">
      {/* BARRA SUPERIOR CON FLECHA AL LADO DE ADMIN */}
      <div className="top-bar">
        {user ? (
          <div className="admin-buttons">
            {/* Si estamos en Gestión, mostramos flecha para volver al menú */}
            {vistaAdmin && (
              <button className="btn-back-inline" onClick={() => setVistaAdmin(false)}>
                <ArrowLeft size={20} />
              </button>
            )}
            
            <button className="btn-top-gestion" onClick={() => setVistaAdmin(!vistaAdmin)}>
              {vistaAdmin ? <Utensils size={18} /> : <Settings size={18} />}
              {vistaAdmin ? " Ver Menú" : " Gestión"}
            </button>

            <button className="btn-top-admin" onClick={() => setConfirmarSalida(true)}>
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button className="btn-top-login" onClick={() => setMostrarLogin(true)}>
            <LogIn size={18} /> Admin
          </button>
        )}
      </div>

      {/* MODAL DE LOGIN (Ya no es una pantalla aparte) */}
      {mostrarLogin && !user && (
        <div className="overlay-msg">
          <div className="login-box-container">
            <Login alCerrar={() => setMostrarLogin(false)} />
          </div>
        </div>
      )}

      {/* MENSAJES DE BIENVENIDA Y SALIDA */}
      {mensajeBienvenida && (
        <div className="overlay-msg">
          <div className="msg-box">
            <Clock color="#6366f1" size={40} />
            <p>{mensajeBienvenida}</p>
          </div>
        </div>
      )}

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

      {/* CONTENIDO PRINCIPAL */}
      {vistaAdmin ? (
        <div className="admin-container">
          <Admin />
        </div>
      ) : (
        <div className="cliente-container">
          <MenuCliente esAdmin={!!user} />
        </div>
      )}
    </div>
  );
}

export default App;