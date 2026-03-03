import React, { useState } from 'react';
import { auth, db } from './firebase'; // Importamos db para buscar mozos/admins
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Lock, Mail, LogIn, ShieldAlert } from 'lucide-react';

// 🔐 Solo los Dueños del Sistema (Superadmins)
const SUPERADMIN_CONFIG = {
  'huamancarrioncande24@gmail.com': { restauranteId: 'restaurante_cande', rol: 'superadmin' },
  'jec02021994@gmail.com': { restauranteId: 'jekito_restobar', rol: 'superadmin' }
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
      // 1. Autenticación con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      const userEmail = user.email.toLowerCase().trim();

      let restauranteIdFinal = null;
      let rolFinal = null;

      // 2. ¿Es Superadmin de código?
      if (SUPERADMIN_CONFIG[userEmail]) {
        restauranteIdFinal = SUPERADMIN_CONFIG[userEmail].restauranteId;
        rolFinal = 'superadmin';
      } else {
        // 3. Si no, buscar en la colección de usuarios_admin (Mozos/Admins registrados por ti)
        const q = query(collection(db, "usuarios_admin"), where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const datos = querySnapshot.docs[0].data();
          restauranteIdFinal = datos.restauranteId;
          rolFinal = datos.rol; // 'admin' o 'mozo'
        }
      }

      // 4. Si no encontramos vinculación, cerramos sesión
      if (!restauranteIdFinal) {
        await signOut(auth);
        setError('Acceso denegado: Usuario no autorizado para este panel.');
        setCargando(false);
        return;
      }

      // 5. Persistencia: Guardamos los privilegios
      localStorage.setItem('esAdmin', 'true');
      localStorage.setItem('restauranteId', restauranteIdFinal);
      localStorage.setItem('rolUsuario', rolFinal);

      // 6. Activar y cerrar
      if (activarAdmin) {
        activarAdmin(restauranteIdFinal); 
      }
      alCerrar();

    } catch (err) {
      console.error("Error en login:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Correo o contraseña incorrectos');
      } else {
        setError('Error de acceso. Reintenta.');
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
        <h2 className="titulo-principal" style={{ fontSize: '1.8rem' }}>Acceso Panel</h2>
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