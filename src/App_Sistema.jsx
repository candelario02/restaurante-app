import React, { useState, useEffect } from 'react';
import './App.css';
import MenuCliente from './MenuCliente';
import Admin from './Admin';
import Login from './Login';
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  LogIn, LogOut, Settings, Clock, ArrowLeft, 
  X, Users, Package, TrendingUp 
} from 'lucide-react';

// 🔐 Mapeo estricto de Superadministradores
const SUPERADMIN_CONFIG = {
  'huamancarrioncande24@gmail.com': { restauranteId: 'restaurante_cande' },
  'jec02021994@gmail.com': { restauranteId: 'jekito_restobar' }
};

function App() {
  const idDesdeURL = window.location.pathname.split('/')[1] || null;

  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
    isAdmin: localStorage.getItem('esAdmin') === 'true',
    restauranteId: idDesdeURL || localStorage.getItem('restauranteId'),
    rol: localStorage.getItem('rolUsuario') || 'cliente'
  });

  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [mensajeBienvenida, setMensajeBienvenida] = useState('');
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [seccion, setSeccion] = useState('menu');
  const [bienvenidaMostrada, setBienvenidaMostrada] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setAuthState({ loading: false, user: null, isAdmin: false, restauranteId: idDesdeURL, rol: 'cliente' });
        limpiarStorage();
        return;
      }
      
      let rolFinal = 'mozo';
      let idRes = idDesdeURL || localStorage.getItem('restauranteId');

      if (SUPERADMIN_CONFIG[usuario.email]) {
        rolFinal = 'superadmin';
        idRes = SUPERADMIN_CONFIG[usuario.email].restauranteId;
      } else {
        const q = query(collection(db, "usuarios_admin"), where("email", "==", usuario.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const datos = querySnapshot.docs[0].data();
          rolFinal = datos.rol; 
          idRes = datos.restauranteId;
        }
      }

      setAuthState({ 
        loading: false, 
        user: usuario, 
        isAdmin: localStorage.getItem('esAdmin') === 'true',
        restauranteId: idRes,
        rol: rolFinal
      });

      localStorage.setItem('rolUsuario', rolFinal);
      if (idRes) localStorage.setItem('restauranteId', idRes);

      if (!bienvenidaMostrada) {
        const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMensajeBienvenida(`¡Bienvenido!\n${rolFinal.toUpperCase()}\n${hora}`);
        setBienvenidaMostrada(true);
        setTimeout(() => setMensajeBienvenida(''), 3000);
      }
    });
    return () => unsubscribe();
  }, [idDesdeURL]);

  const limpiarStorage = () => {
    localStorage.removeItem('esAdmin');
    localStorage.removeItem('restauranteId');
    localStorage.removeItem('rolUsuario');
  };

  const manejarCerrarSesion = async () => {
    await signOut(auth);
    limpiarStorage();
    setAuthState({ loading: false, user: null, isAdmin: false, restauranteId: idDesdeURL, rol: 'cliente' });
    setConfirmarSalida(false);
    setSeccion('menu');
    setBienvenidaMostrada(false);
  };

  const alternarModoAdmin = (valor, idRestaurante = null) => {
    const idFinal = idRestaurante || authState.restauranteId;
    setAuthState(p => ({ ...p, isAdmin: valor, restauranteId: idFinal }));
    localStorage.setItem('esAdmin', valor.toString());
  };

  if (authState.loading) return null;

  return (
    <div className="App">
      {/* MENSAJE FLOTANTE DE BIENVENIDA */}
      {mensajeBienvenida && (
        <div className="welcome-toast">
          {mensajeBienvenida}
        </div>
      )}

      <nav className="top-bar">
        {authState.user ? (
          <>
            {authState.isAdmin ? (
              <button className="btn-back-inline" onClick={() => alternarModoAdmin(false)}>
                <ArrowLeft size={20} />
              </button>
            ) : <div style={{ width: '40px' }}></div>}

            <div className="admin-buttons">
              {!authState.isAdmin ? (
                <button className="btn-top-gestion active" onClick={() => alternarModoAdmin(true)}>
                  <Settings size={18} /> <span>Panel</span>
                </button>
              ) : (
                <>
                  <button className={`btn-top-gestion ${seccion === 'menu' ? 'active' : ''}`} onClick={() => setSeccion('menu')}>
                    <Settings size={18} /> <span>Menú</span>
                  </button>
                  
                  {authState.rol === 'superadmin' && (
                    <button className={`btn-top-gestion ${seccion === 'usuarios' ? 'active' : ''}`} onClick={() => setSeccion('usuarios')}>
                      <Users size={18} /> <span>Usuarios</span>
                    </button>
                  )}

                  <button className={`btn-top-gestion ${seccion === 'pedidos' ? 'active' : ''}`} onClick={() => setSeccion('pedidos')}>
                    <Package size={18} /> <span>Pedidos</span>
                  </button>
                  
                  {authState.rol !== 'mozo' && (
                    <button className={`btn-top-gestion ${seccion === 'ventas' ? 'active' : ''}`} onClick={() => setSeccion('ventas')}>
                      <TrendingUp size={18} /> <span>Caja</span>
                    </button>
                  )}
                </>
              )}
              <button className="btn-top-admin" onClick={() => setConfirmarSalida(true)}><LogOut size={18} /></button>
            </div>
          </>
        ) : (
          <button className="btn-top-login" onClick={() => setMostrarLogin(true)}>
            <LogIn size={18} /> Admin
          </button>
        )}
      </nav>

      <main>
        {authState.user && authState.isAdmin ? (
          <Admin 
            seccion={seccion} 
            restauranteId={authState.restauranteId} 
            rolUsuario={authState.rol} 
          /> 
        ) : (
          <MenuCliente restauranteId={authState.restauranteId} />
        )}
      </main>

      {/* 🟢 MODAL DE LOGIN (ESTO ERA LO QUE FALTABA) */}
      {mostrarLogin && (
        <div className="modal-overlay">
          <div className="modal-content login-modal">
            <button className="btn-close-modal" onClick={() => setMostrarLogin(false)}>
              <X size={24} />
            </button>
            <Login 
              onClose={() => setMostrarLogin(false)} 
              onSuccess={(id) => {
                setMostrarLogin(false);
                alternarModoAdmin(true, id);
              }}
            />
          </div>
        </div>
      )}

      {/* 🔴 MODAL DE CONFIRMAR SALIDA */}
      {confirmarSalida && (
        <div className="modal-overlay">
          <div className="modal-content confirm-modal">
            <h3>¿Cerrar sesión?</h3>
            <p>Deberás ingresar tus credenciales nuevamente.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmarSalida(false)}>Cancelar</button>
              <button className="btn-confirm-exit" onClick={manejarCerrarSesion}>Cerrar Sesión</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;