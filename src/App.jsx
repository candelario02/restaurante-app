import React, { useState, useEffect } from 'react';
import './App.css';
import MenuCliente from './MenuCliente';
import Admin from './Admin';
import Login from './Login';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { LogIn, LogOut, Settings, Clock, ArrowLeft, X, Users } from 'lucide-react';

function App() {
  // 🔐 Estado ÚNICO de autenticación
  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
    isAdmin: false
  });

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mensajeBienvenida, setMensajeBienvenida] = useState("");
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [seccion, setSeccion] = useState('menu');

  // 🔥 Listener Firebase — SOLO UNA VEZ
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) {
        localStorage.removeItem('esAdmin');
        setAuthState({
          loading: false,
          user: null,
          isAdmin: false
        });
        return;
      }

      const isAdmin = localStorage.getItem('esAdmin') === 'true';

      setAuthState({
        loading: false,
        user: usuario,
        isAdmin
      });

      if (!mensajeBienvenida) {
        const hora = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });
        setMensajeBienvenida(`¡Sesión Activa!\n${usuario.email}\n${hora}`);
        setTimeout(() => setMensajeBienvenida(""), 3000);
      }
    });

    return unsubscribe;
  }, []);

  const manejarCerrarSesion = async () => {
    await signOut(auth);
    localStorage.removeItem('esAdmin');
    setAuthState({
      loading: false,
      user: null,
      isAdmin: false
    });
    setConfirmarSalida(false);
  };

  // ⛔ Bloquea render hasta resolver auth
  if (authState.loading) return null;

  return (
    <div className="App">
      <div className="top-bar">
        {authState.user ? (
          authState.isAdmin && (
            <div className="admin-buttons">
              <button
                className="btn-back-inline"
                onClick={() => {
                  localStorage.setItem('esAdmin', 'false');
                  setAuthState(prev => ({ ...prev, isAdmin: false }));
                }}
              >
                <ArrowLeft size={20} />
              </button>

              <button
                className={`btn-top-gestion ${seccion === 'menu' ? 'active' : ''}`}
                onClick={() => {
                  localStorage.setItem('esAdmin', 'true');
                  setSeccion('menu');
                  setAuthState(prev => ({ ...prev, isAdmin: true }));
                }}
              >
                <Settings size={18} /> Gestión
              </button>

              <button
                className={`btn-top-gestion ${seccion === 'usuarios' ? 'active' : ''}`}
                style={{
                  background: seccion === 'usuarios' ? '#10b981' : 'white',
                  color: seccion === 'usuarios' ? 'white' : '#1e293b'
                }}
                onClick={() => {
                  localStorage.setItem('esAdmin', 'true');
                  setSeccion('usuarios');
                  setAuthState(prev => ({ ...prev, isAdmin: true }));
                }}
              >
                <Users size={18} /> Usuarios
              </button>

              <button className="btn-top-admin" onClick={() => setConfirmarSalida(true)}>
                <LogOut size={18} />
              </button>
            </div>
          )
        ) : (
          <button className="btn-top-login" onClick={() => setMostrarLogin(true)}>
            <LogIn size={18} /> Admin
          </button>
        )}
      </div>

      {mostrarLogin && !authState.user && (
        <div className="overlay-msg">
          <div className="msg-box login-modal">
            <button className="close-btn-modal" onClick={() => setMostrarLogin(false)}>
              <X size={20} />
            </button>
            <Login
              alCerrar={() => setMostrarLogin(false)}
              activarAdmin={() => {
                localStorage.setItem('esAdmin', 'true');
                setAuthState(prev => ({ ...prev, isAdmin: true }));
              }}
            />
          </div>
        </div>
      )}

      {mensajeBienvenida && (
        <div className="overlay-msg">
          <div className="msg-box welcome-box">
            <Clock color="#6366f1" size={40} />
            <pre>{mensajeBienvenida}</pre>
          </div>
        </div>
      )}

      {confirmarSalida && (
        <div className="overlay-msg">
          <div className="msg-box modal-confirm-styled">
            <div className="icon-circle-warning">
              <LogOut size={30} color="#ef4444" />
            </div>
            <h3>¿Cerrar Sesión?</h3>
            <div className="modal-buttons">
              <button className="btn-no" onClick={() => setConfirmarSalida(false)}>
                Cancelar
              </button>
              <button className="btn-yes" onClick={manejarCerrarSesion}>
                Sí, Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Render FINAL — SIN race condition */}
      {authState.user && authState.isAdmin ? (
        <div className="admin-container">
          <Admin seccion={seccion} />
        </div>
      ) : (
        <div className="cliente-container">
          <MenuCliente />
        </div>
      )}
    </div>
  );
}

export default App;
