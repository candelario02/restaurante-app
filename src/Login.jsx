import React, { useState } from 'react';
import { auth } from './firebase';
import {
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { Lock, Mail, LogIn, ShieldAlert } from 'lucide-react';

// 🔐 Correos autorizados como ADMIN
const ADMIN_EMAILS = [
  'huamancarrioncande24@gmail.com'
];

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
      // 1️⃣ Login Firebase Auth
      const { user } = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // 2️⃣ Validación ADMIN por email
      if (!ADMIN_EMAILS.includes(user.email)) {
        await signOut(auth);
        setError(
          'Acceso denegado: este usuario no tiene permisos de administrador.'
        );
        return;
      }

      // 3️⃣ Admin válido → activar modo admin
      activarAdmin();
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
        {error.includes('Acceso') ? (
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

        <button
          type="submit"
          className="btn-login-submit"
          disabled={cargando}
        >
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
