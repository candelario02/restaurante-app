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

      // 2️⃣ Validación ADMIN por email (Tu lógica de seguridad original)
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
      // Manejo de errores detallado
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos');
      } else {
        setError('Error al intentar iniciar sesión. Reintenta.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-content">
      {/* Icono de cabecera dinámico según el error */}
      <div className="icon-circle-warning">
        {error.includes('Acceso') ? (
          <ShieldAlert size={40} color="var(--danger)" />
        ) : (
          <Lock size={40} color="var(--primary)" />
        )}
      </div>

      <div className="header-brand" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: '0', color: 'var(--text-main)' }}>Acceso Admin</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ingresa tus credenciales autorizadas</p>
      </div>

      <form onSubmit={manejarLogin} className="login-form">
        {/* Grupo: Email */}
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

        {/* Grupo: Contraseña */}
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

        {/* Caja de Error (Usando variables de tu CSS) */}
        {error && (
          <div style={{ 
            background: '#fef2f2', 
            border: '1px solid var(--danger)', 
            padding: '12px', 
            borderRadius: 'var(--radius)',
            marginTop: '10px'
          }}>
            <p style={{ 
              color: 'var(--danger)', 
              fontSize: '0.85rem', 
              margin: 0, 
              textAlign: 'center',
              fontWeight: '500'
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Botón de envío con estado de carga */}
        <button 
          type="submit" 
          className="btn-login-submit" 
          disabled={cargando}
          style={{ marginTop: '10px' }}
        >
          {cargando ? (
            'Verificando...'
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