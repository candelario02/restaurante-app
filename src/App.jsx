import React, { useState, useEffect } from 'react';
import './App.css';
import MenuCliente from './MenuCliente';
import Admin from './Admin';
import Login from './Login';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { LogIn, LogOut, Settings, Clock, ArrowLeft, X, Users } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mensajeBienvenida, setMensajeBienvenida] = useState("");
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  
  // LEEMOS SI YA ESTÁBAMOS EN MODO ADMIN
  const [vistaAdmin, setVistaAdmin] = useState(localStorage.getItem('esAdmin') === 'true');
  const [seccion, setSeccion] = useState('menu');
  const [cargandoAuth, setCargandoAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      if (usuario) {
        setUser(usuario);
        // Si el usuario acaba de entrar, disparamos el cartel de bienvenida
        if (!mensajeBienvenida) {
            const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setMensajeBienvenida(`¡Sesión Activa! \n ${usuario.email} \n ${hora}`);
            setTimeout(() => setMensajeBienvenida(""), 3000);
        }
      } else {
        setUser(null);
        setVistaAdmin(false);
        localStorage.removeItem('esAdmin');
      }
      setCargandoAuth(false);
    });
    return () => unsubscribe();
  }, [user]);

  const manejarCerrarSesion = async () => {
    await signOut(auth);
    localStorage.removeItem('esAdmin');
    setUser(null);
    setVistaAdmin(false);
    setConfirmarSalida(false);
  };

  if (cargandoAuth) return null;

  return (
    <div className="App">
      <div className="top-bar">
        {user ? (
          <div className="admin-buttons">
            {vistaAdmin && (
              <button className="btn-back-inline" onClick={() => {setVistaAdmin(false); localStorage.setItem('esAdmin', 'false');}}>
                <ArrowLeft size={20} />
              </button>
            )}
            
            <button className={`btn-top-gestion ${seccion === 'menu' && vistaAdmin ? 'active' : ''}`} 
                    onClick={() => { setVistaAdmin(true); setSeccion('menu'); localStorage.setItem('esAdmin', 'true'); }}>
              <Settings size={18} /> Gestión
            </button>

            <button className={`btn-top-gestion ${seccion === 'usuarios' && vistaAdmin ? 'active' : ''}`}
                    style={{
                      background: seccion === 'usuarios' && vistaAdmin ? '#10b981' : 'white', 
                      color: seccion === 'usuarios' && vistaAdmin ? 'white' : '#1e293b'
                    }}
                    onClick={() => { setVistaAdmin(true); setSeccion('usuarios'); localStorage.setItem('esAdmin', 'true'); }}>
              <Users size={18} /> Usuarios
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

      {/* LOGIN MODAL */}
      {mostrarLogin && !user && (
        <div className="overlay-msg">
          <div className="msg-box login-modal">
            <button className="close-btn-modal" onClick={() => setMostrarLogin(false)}><X size={20} /></button>
            <Login alCerrar={() => setMostrarLogin(false)} />
          </div>
        </div>
      )}

      {/* BIENVENIDA */}
      {mensajeBienvenida && (
        <div className="overlay-msg">
          <div className="msg-box welcome-box">
            <Clock color="#6366f1" size={40} />
            <pre>{mensajeBienvenida}</pre>
          </div>
        </div>
      )}

      {/* CONFIRMAR SALIDA */}
      {confirmarSalida && (
        <div className="overlay-msg">
          <div className="msg-box modal-confirm-styled">
            <div className="icon-circle-warning"><LogOut size={30} color="#ef4444" /></div>
            <h3>¿Cerrar Sesión?</h3>
            <div className="modal-buttons">
              <button className="btn-no" onClick={() => setConfirmarSalida(false)}>Cancelar</button>
              <button className="btn-yes" onClick={manejarCerrarSesion}>Sí, Salir</button>
            </div>
          </div>
        </div>
      )}

      {/* RENDERIZADO PRINCIPAL */}
      {vistaAdmin && user ? (
        <div className="admin-container">
          <Admin seccion={seccion} />
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