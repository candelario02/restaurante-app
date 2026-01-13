import React, { useState } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Lock, Mail, LogIn, ShieldAlert } from 'lucide-react';

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
      // 🔐 1. Login Firebase
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      // 🛡️ 2. Verificación ADMIN en Firestore
      const q = query(
        collection(db, 'usuarios_admin'),
        where('email', '==', user.email.toLowerCase())
      );
      const snap = await getDocs(q);

      // ❌ No es admin → expulsión inmediata
      if (snap.empty) {
        await signOut(auth);
        localStorage.removeItem('esAdmin');
        setError('Acceso Denegado: Tu correo no está autorizado como administrador.');
        return;
      }

      // ✅ 3. ES ADMIN → persistimos ANTES de que Firebase notifique
      localStorage.setItem('esAdmin', 'true');

      // 🔥 4. Sincronizamos App.jsx inmediatamente (bloquea desmontaje)
      if (activarAdmin) activarAdmin();

      // ✅ 5. Cerramos modal
      alCerrar();

    } catch (err) {
      console.error(err);
      setError('Correo o contraseña incorrectos');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-content">
      <div className="login-icon-header">
        {error.includes('Acceso Denegado') ? (
          <ShieldAlert size={40} color="#ef4444" />
        ) : (
          <Lock size={40} color="#6366f1" />
        )}
      </div>

      <h2>Acceso Admin</h2>
      <p>Ingresa tus credenciales autorizadas</p>

      <form onSubmit={manejarLogin} className="login-form">
        <div className="input-group">
          <Mail size={18} className="input-icon" />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
          />
        </div>

        {error && (
          <div
            className="error-box"
            style={{
              background: '#fee2e2',
              padding: '10px',
              borderRadius: '8px',
              margin: '10px 0'
            }}
          >
            <p
              className="error-text"
              style={{
                color: '#b91c1c',
                fontSize: '0.8rem',
                textAlign: 'center'
              }}
            >
              {error}
            </p>
          </div>
        )}

        <button type="submit" className="btn-login-submit" disabled={cargando}>
          {cargando ? (
            'Verificando...'
          ) : (
            <>
              <LogIn size={20} /> Entrar
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default Login;
