import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Lock, Mail, LogIn } from 'lucide-react';

function Login({ alCerrar }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const manejarLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alCerrar();
    } catch (err) {
      setError("Credenciales incorrectas");
    }
  };

  return (
    <div className="login-content">
      <div className="login-icon-header">
        <Lock size={40} color="#6366f1" />
      </div>
      <h2>Acceso Admin</h2>
      <p>Ingresa tus credenciales para gestionar el menú</p>

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

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn-login-submit">
          <LogIn size={20} /> Entrar
        </button>
      </form>
    </div>
  );
}

export default Login;