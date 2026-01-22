import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Lock, Mail, LogIn, ShieldAlert } from 'lucide-react';

// 🔐 Mapeo estricto de correos a sus respectivos Restaurantes
const ADMIN_CONFIG = {
  'huamancarrioncande24@gmail.com': { restauranteId: 'restaurante_cande' },
  'jec02021994@gmail.com': { restauranteId: 'jekito_restobar' }
};

function Login({ alCerrar, activarAdmin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      // 1. Intentar autenticación con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      // Convertimos a minúsculas para evitar errores de coincidencia
      const userEmail = user.email.toLowerCase().trim();

      // 2. Verificar si el correo tiene un restaurante asignado en ADMIN_CONFIG
      const config = ADMIN_CONFIG[userEmail];

      if (!config) {
        await signOut(auth);
        setError('Acceso denegado: este correo no está vinculado a ningún restaurante.');
        setCargando(false);
        return;
      }

      // 3. Persistencia de datos: Guardamos TODO antes de activar el modo admin
      localStorage.setItem('esAdmin', 'true');
      localStorage.setItem('restauranteId', config.restauranteId);

      // 4. Notificar a App.jsx pasándole el ID correcto
      if (activarAdmin) {
        activarAdmin(config.restauranteId); 
      }
      
      // 5. Cerrar el modal de login
      alCerrar();

    } catch (err) {
      console.error("Error en login:", err);
      // Errores comunes de Firebase Auth
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Correo o contraseña incorrectos');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Intenta más tarde.');
      } else {
        setError('Error de conexión. Reintenta.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-content">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        {error ? (
          <ShieldAlert size={50} color="var(--danger)" />
        ) : (
          <Lock size={50} color="var(--primary)" />
        )}
      </div>

      <div className="header-brand">
        <h2 className="titulo-principal" style={{ fontSize: '1.8rem' }}>Acceso Admin</h2>
        <p className="text-muted">Ingresa tus credenciales autorizadas</p>
      </div>

      <form onSubmit={manejarLogin} className="login-form">
        <div className="input-group">
          <Mail size={18} className="input-icon" />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="input-group">
          <Lock size={18} className="input-icon" />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="mensaje-alerta error" style={{ padding: '10px', fontSize: '0.9rem', position: 'relative' }}>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          className={`btn-login-submit ${cargando ? 'btn-loading' : ''}`} 
          disabled={cargando}
        >
          {cargando ? (
            <div className="spinner-loader"></div>
          ) : (
            <>
              <LogIn size={20} /> 
              <span>Entrar al Panel</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default Login;