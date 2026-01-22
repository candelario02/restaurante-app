import React, { useState, useEffect } from 'react';
import './App.css';
import MenuCliente from './MenuCliente';
import Admin from './Admin';
import Login from './Login';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  LogIn, LogOut, Settings, Clock, ArrowLeft, 
  X, Users, Package, TrendingUp 
} from 'lucide-react';

function App() {
  // Capturamos el ID del restaurante directamente de la URL
  // Ejemplo: localhost:5173/jekito_restobar -> idDesdeURL será "jekito_restobar"
  const idDesdeURL = window.location.pathname.split('/')[1] || null;

  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
    isAdmin: localStorage.getItem('esAdmin') === 'true',
    restauranteId: idDesdeURL || localStorage.getItem('restauranteId')
  });

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mensajeBienvenida, setMensajeBienvenida] = useState('');
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [seccion, setSeccion] = useState('menu');
  const [bienvenidaMostrada, setBienvenidaMostrada] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) {
        setAuthState({ loading: false, user: null, isAdmin: false, restauranteId: idDesdeURL });
        localStorage.removeItem('esAdmin');
        localStorage.removeItem('restauranteId');
        setBienvenidaMostrada(false);
        return;
      }
      
      const eraAdmin = localStorage.getItem('esAdmin') === 'true';
      // Si hay un ID en la URL lo usamos, si no, el del localstorage
      const idRes = idDesdeURL || localStorage.getItem('restauranteId');

      setAuthState({ 
        loading: false, 
        user: usuario, 
        isAdmin: eraAdmin,
        restauranteId: idRes
      });

      if (!bienvenidaMostrada) {
        const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMensajeBienvenida(`¡Sesión Activa!\n${usuario.email}\n${hora}`);
        setBienvenidaMostrada(true);
        setTimeout(() => setMensajeBienvenida(''), 3000);
      }
    });
    return () => unsubscribe();
  }, [bienvenidaMostrada, idDesdeURL]);

  const manejarCerrarSesion = async () => {
    await signOut(auth);
    localStorage.removeItem('esAdmin');
    localStorage.removeItem('restauranteId');
    setAuthState({ loading: false, user: null, isAdmin: false, restauranteId: idDesdeURL });
    setConfirmarSalida(false);
    setSeccion('menu');
  };

  const alternarModoAdmin = (valor, idRestaurante = null) => {
    const idFinal = idRestaurante || idDesdeURL || authState.restauranteId;
    setAuthState(p => ({ 
      ...p, 
      isAdmin: valor,
      restauranteId: idFinal 
    }));
    localStorage.setItem('esAdmin', valor.toString());
    if (idFinal) {
      localStorage.setItem('restauranteId', idFinal);
    }
  };

  if (authState.loading) return null;

  return (
    <div className="App">
      {/* BARRA SUPERIOR */}
      <nav className="top-bar">
        {authState.user ? (
          <>
            {authState.isAdmin ? (
              <button className="btn-back-inline" title="Vista Cliente" onClick={() => alternarModoAdmin(false)}>
                <ArrowLeft size={20} />
              </button>
            ) : (
              <div style={{ width: '40px' }}></div>
            )}

            <div className="admin-buttons">
              {!authState.isAdmin ? (
                <button className="btn-top-gestion active" onClick={() => alternarModoAdmin(true)}>
                  <Settings size={18} /> <span>Volver al Panel</span>
                </button>
              ) : (
                <>
                  <button className={`btn-top-gestion ${seccion === 'menu' ? 'active' : ''}`} onClick={() => setSeccion('menu')}>
                    <Settings size={18} /> <span>Menú</span>
                  </button>
                  <button className={`btn-top-gestion ${seccion === 'usuarios' ? 'active' : ''}`} onClick={() => setSeccion('usuarios')}>
                    <Users size={18} /> <span>Usuarios</span>
                  </button>
                  <button className={`btn-top-gestion ${seccion === 'pedidos' ? 'active' : ''}`} onClick={() => setSeccion('pedidos')}>
                    <Package size={18} /> <span>Pedidos</span>
                  </button>
                  <button className={`btn-top-gestion ${seccion === 'ventas' ? 'active' : ''}`} onClick={() => setSeccion('ventas')}>
                    <TrendingUp size={18} /> <span>Caja</span>
                  </button>
                </>
              )}
              
              <button className="btn-top-admin" onClick={() => setConfirmarSalida(true)}>
                <LogOut size={18} />
              </button>
            </div>
          </>
        ) : (
          <button className="btn-top-login" onClick={() => setMostrarLogin(true)}>
            <LogIn size={18} /> Admin
          </button>
        )}
      </nav>

      {/* MODALES */}
      {mostrarLogin && (
        <div className="overlay-msg">
          <div className="msg-box">
            <button className="btn-back-inline" onClick={() => setMostrarLogin(false)} style={{position: 'absolute', top: '15px', right: '15px'}}>
              <X size={20}/>
            </button>
            <Login 
              alCerrar={() => setMostrarLogin(false)} 
              activarAdmin={(id) => alternarModoAdmin(true, id)} 
            />
          </div>
        </div>
      )}

      {mensajeBienvenida && (
        <div className="overlay-msg">
          <div className="mensaje-alerta exito">
             <Clock size={24} />
             <pre>{mensajeBienvenida}</pre>
          </div>
        </div>
      )}

      {confirmarSalida && (
        <div className="overlay-msg">
          <div className="msg-box">
            <LogOut size={40} color="var(--danger)" style={{ marginBottom: '15px' }} />
            <h3>¿Cerrar Sesión?</h3>
            <p className="text-muted">Deberás ingresar tus credenciales nuevamente.</p>
            <div className="modal-buttons">
              <button className="btn-no" onClick={() => setConfirmarSalida(false)}>Cancelar</button>
              <button className="btn-yes" onClick={manejarCerrarSesion}>Sí, Salir</button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main>
        {authState.user && authState.isAdmin ? (
          <Admin 
            seccion={seccion} 
            restauranteId={authState.restauranteId} 
          /> 
        ) : (
          <MenuCliente restauranteId={authState.restauranteId} />
        )}
      </main>
    </div>
  );
}

export default App;