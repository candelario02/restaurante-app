import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Lock, Mail, LogIn, ShieldAlert } from 'lucide-react';

// 🔐 Lista de correos autorizados como Administradores
const ADMIN_EMAILS = [
  'huamancarrioncande24@gmail.com',
  'jec02021994@gmail.com' 
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2️⃣ Validación ADMIN por email
      if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        await signOut(auth);
        setError('Acceso denegado: este usuario no tiene permisos de administrador.');
        setCargando(false);
        return;
      }

      // 3️⃣ ÉXITO: Activamos la vista admin y cerramos modal
      if (activarAdmin) activarAdmin(); 
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
      {/* El diseño de estos iconos ahora depende de las clases CSS */}
      <div className="icon-circle-warning">
        {error.includes('Acceso') ? (
          <ShieldAlert size={40} />
        ) : (
          <Lock size={40} />
        )}
      </div>

      <div className="header-brand">
        <h2>Acceso Admin</h2>
        <p>Ingresa tus credenciales autorizadas</p>
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
          <div className="msg-box" style={{ padding: '10px', boxShadow: 'none', border: '1px solid var(--danger)' }}>
            <p className="text-muted" style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
              {error}
            </p>
          </div>
        )}

        <button type="submit" className="btn-login-submit" disabled={cargando}>
          {cargando ? 'Verificando...' : <><LogIn size={20} /> Entrar</>}
        </button>
      </form>
    </div>
  );
}

export default Login;