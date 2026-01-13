import React, { useState } from 'react';
import { auth, db } from './firebase'; // Importamos db para consultar Firestore
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Lock, Mail, LogIn, ShieldAlert } from 'lucide-react';

function Login({ alCerrar }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      // 1. Intento de autenticación normal en Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Verificar si el correo está en la lista de 'usuarios_admin' en Firestore
      const q = query(collection(db, "usuarios_admin"), where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Si no está en la lista de permitidos, cerramos sesión inmediatamente
        await signOut(auth);
        setError("Acceso Denegado: No tienes privilegios de administrador.");
      } else {
        // Si está en la lista, el login es exitoso
        alCerrar();
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Correo o contraseña incorrectos");
      } else {
        setError("Error al intentar ingresar. Reintente.");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-content">
      <div className="login-icon-header">
        {error.includes("Acceso Denegado") ? (
          <ShieldAlert size={40} color="#ef4444" />
        ) : (
          <Lock size={40} color="#6366f1" />
        )}
      </div>
      <h2>Acceso Admin</h2>
      <p>Solo personal autorizado por el administrador principal.</p>

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
          <div className="error-box" style={{ 
            background: '#fee2e2', 
            padding: '10px', 
            borderRadius: '8px', 
            margin: '10px 0' 
          }}>
            <p className="error-text" style={{ color: '#b91c1c', fontSize: '0.8rem' }}>{error}</p>
          </div>
        )}

        <button type="submit" className="btn-login-submit" disabled={cargando}>
          {cargando ? "Verificando..." : <><LogIn size={20} /> Entrar</>}
        </button>
      </form>
    </div>
  );
}

export default Login;