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
  // 🔐 Estado de autenticación con persistencia en localStorage
  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
    isAdmin: localStorage.getItem('esAdmin') === 'true'
  });

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mensajeBienvenida, setMensajeBienvenida] = useState('');
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [seccion, setSeccion] = useState('menu');
  const [bienvenidaMostrada, setBienvenidaMostrada] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) {
        setAuthState({
          loading: false,
          user: null,
          isAdmin: false
        });
        localStorage.removeItem('esAdmin');
        setBienvenidaMostrada(false);
        return;
      }

      // Verificamos si ya estaba marcado como admin
      const eraAdmin = localStorage.getItem('esAdmin') === 'true';

      setAuthState((prev) => ({
        ...prev,
        loading: false,
        user: usuario,
        isAdmin: eraAdmin // Mantiene el estado visual
      }));

      // 👋 Mensaje de bienvenida único
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
    localStorage.removeItem('esAdmin');
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
      {/* 🔝 BARRA SUPERIOR CONSTANTE */}
      <div className="top-bar">
        {authState.user ? (
          <div className="admin-buttons">
            {!authState.isAdmin ? (
              <button
                className="btn-top-gestion active"
                onClick={() => {
                  setAuthState(prev => ({ ...prev, isAdmin: true }));
                  localStorage.setItem('esAdmin', 'true');
                }}
              >
                <Settings size={18} /> Volver al Panel
              </button>
            ) : (
              <>
                <button
                  className="btn-back-inline"
                  title="Ver como Cliente"
                  onClick={() => {
                    setAuthState((prev) => ({ ...prev, isAdmin: false }));
                    localStorage.setItem('esAdmin', 'false');
                  }}
                >
                  <ArrowLeft size={20} />
                </button>

                <button
                  className={`btn-top-gestion ${seccion === 'menu' ? 'active' : ''}`}
                  onClick={() => setSeccion('menu')}
                >
                  <Settings size={18} /> <span>Menú</span>
                </button>

                <button
                  className={`btn-top-gestion ${seccion === 'usuarios' ? 'active' : ''}`}
                  style={{
                    borderBottom: seccion === 'usuarios' ? '2px solid #10b981' : 'none'
                  }}
                  onClick={() => setSeccion('usuarios')}
                >
                  <Users size={18} /> <span>Usuarios</span>
                </button>

                <button
                  className={`btn-top-gestion ${seccion === 'pedidos' ? 'active' : ''}`}
                  style={{
                    borderBottom: seccion === 'pedidos' ? '2px solid #6366f1' : 'none'
                  }}
                  onClick={() => setSeccion('pedidos')}
                >
                  <Package size={18} /> <span>Pedidos</span>
                </button>
              </>
            )}

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

      {/* 🔐 MODAL DE LOGIN */}
      {mostrarLogin && !authState.user && (
        <div className="overlay-msg">
          <div className="msg-box login-modal">
            <button className="close-btn-modal" onClick={() => setMostrarLogin(false)}>
              <X size={20} />
            </button>
            <Login 
              alCerrar={() => setMostrarLogin(false)} 
              activarAdmin={() => {
                setAuthState(prev => ({ ...prev, isAdmin: true }));
                localStorage.setItem('esAdmin', 'true');
              }}
            />
          </div>
        </div>
      )}

      {/* 👋 POPUP BIENVENIDA */}
      {mensajeBienvenida && (
        <div className="overlay-msg">
          <div className="msg-box welcome-box">
            <div className="icon-circle" style={{ background: '#eef2ff', padding: '15px', borderRadius: '50%', display: 'inline-block' }}>
               <Clock color="#6366f1" size={40} />
            </div>
            <pre style={{ marginTop: '15px', fontWeight: '600' }}>{mensajeBienvenida}</pre>
          </div>
        </div>
      )}

      {/* ❌ DIÁLOGO CERRAR SESIÓN */}
      {confirmarSalida && (
        <div className="overlay-msg">
          <div className="msg-box modal-confirm-styled">
            <div className="icon-circle-warning">
              <LogOut size={30} color="#ef4444" />
            </div>
            <h3>¿Cerrar Sesión?</h3>
            <p style={{ color: '#64748b' }}>Deberás ingresar tus credenciales nuevamente.</p>
            <div className="modal-buttons">
              <button className="btn-no" onClick={() => setConfirmarSalida(false)}>Cancelar</button>
              <button className="btn-yes" onClick={manejarCerrarSesion}>Sí, Salir</button>
            </div>
          </div>
        </div>
      )}

      {/* 🧠 CONTENIDO DINÁMICO */}
      <main className="main-content">
        {authState.user && authState.isAdmin ? (
          <div className="admin-container">
            <Admin seccion={seccion} />
          </div>
        ) : (
          <div className="cliente-container">
            <MenuCliente />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;