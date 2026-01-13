import React, { useState, useEffect } from 'react';
import './App.css';
import MenuCliente from './MenuCliente';
import Admin from './Admin';
import Login from './Login';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  LogIn,
  LogOut,
  Settings,
  Clock,
  ArrowLeft,
  X,
  Users,
  Package
} from 'lucide-react';

function App() {
  // 🔐 Estado único de auth
  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
    isAdmin: false
  });

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mensajeBienvenida, setMensajeBienvenida] = useState('');
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [seccion, setSeccion] = useState('menu');
  const [bienvenidaMostrada, setBienvenidaMostrada] = useState(false); // 🔒 evita el loop

  // 🔥 Listener Firebase → SOLO UNA VEZ
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) {
        setAuthState({
          loading: false,
          user: null,
          isAdmin: false
        });
        setBienvenidaMostrada(false);
        return;
      }

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        user: usuario,
        isAdmin: true // 🔥 al loguear entra directo a admin
      }));

      // 👋 Mostrar bienvenida SOLO UNA VEZ
      if (!bienvenidaMostrada) {
        const hora = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });

        setMensajeBienvenida(`¡Sesión Activa!\n${usuario.email}\n${hora}`);
        setBienvenidaMostrada(true);

        setTimeout(() => setMensajeBienvenida(''), 3000);
      }
    });

    return () => unsubscribe();
  }, [bienvenidaMostrada]);

  const manejarCerrarSesion = async () => {
    await signOut(auth);
    setAuthState({
      loading: false,
      user: null,
      isAdmin: false
    });
    setConfirmarSalida(false);
    setSeccion('menu');
  };

  if (authState.loading) return null;

  return (
    <div className="App">
      {/* 🔝 TOP BAR */}
      <div className="top-bar">
        {authState.user ? (
          authState.isAdmin && (
            <div className="admin-buttons">
              <button
                className="btn-back-inline"
                onClick={() =>
                  setAuthState((prev) => ({ ...prev, isAdmin: false }))
                }
              >
                <ArrowLeft size={20} />
              </button>

              <button
                className={`btn-top-gestion ${seccion === 'menu' ? 'active' : ''}`}
                onClick={() => setSeccion('menu')}
              >
                <Settings size={18} /> Menú
              </button>

              <button
                className={`btn-top-gestion ${seccion === 'usuarios' ? 'active' : ''}`}
                style={{
                  background: seccion === 'usuarios' ? '#10b981' : 'white',
                  color: seccion === 'usuarios' ? 'white' : '#1e293b'
                }}
                onClick={() => setSeccion('usuarios')}
              >
                <Users size={18} /> Usuarios
              </button>

              <button
                className={`btn-top-gestion ${seccion === 'pedidos' ? 'active' : ''}`}
                style={{
                  background: seccion === 'pedidos' ? '#6366f1' : 'white',
                  color: seccion === 'pedidos' ? 'white' : '#1e293b'
                }}
                onClick={() => setSeccion('pedidos')}
              >
                <Package size={18} /> Pedidos
              </button>

              <button
                className="btn-top-admin"
                onClick={() => setConfirmarSalida(true)}
              >
                <LogOut size={18} />
              </button>
            </div>
          )
        ) : (
          <button
            className="btn-top-login"
            onClick={() => setMostrarLogin(true)}
          >
            <LogIn size={18} /> Admin
          </button>
        )}
      </div>

      {/* 🔐 LOGIN */}
      {mostrarLogin && !authState.user && (
        <div className="overlay-msg">
          <div className="msg-box login-modal">
            <button
              className="close-btn-modal"
              onClick={() => setMostrarLogin(false)}
            >
              <X size={20} />
            </button>
            <Login alCerrar={() => setMostrarLogin(false)} />
          </div>
        </div>
      )}

      {/* 👋 BIENVENIDA */}
      {mensajeBienvenida && (
        <div className="overlay-msg">
          <div className="msg-box welcome-box">
            <Clock color="#6366f1" size={40} />
            <pre>{mensajeBienvenida}</pre>
          </div>
        </div>
      )}

      {/* ❌ CONFIRMAR SALIDA */}
      {confirmarSalida && (
        <div className="overlay-msg">
          <div className="msg-box modal-confirm-styled">
            <div className="icon-circle-warning">
              <LogOut size={30} color="#ef4444" />
            </div>
            <h3>¿Cerrar Sesión?</h3>
            <div className="modal-buttons">
              <button
                className="btn-no"
                onClick={() => setConfirmarSalida(false)}
              >
                Cancelar
              </button>
              <button className="btn-yes" onClick={manejarCerrarSesion}>
                Sí, Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🧠 RENDER PRINCIPAL */}
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
