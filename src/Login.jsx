import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { X, Lock } from 'lucide-react';

const Login = ({ alCerrar }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const acceder = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      alCerrar(); 
    } catch (error) {
      alert("Credenciales incorrectas");
    }
  };

  return (
    <div className="overlay-msg"> {/* Reutilizamos el fondo oscuro */}
      <div className="login-card">
        <button className="btn-close-login" onClick={alCerrar}><X size={20}/></button>
        
        <div className="login-icon">
          <Lock size={30} color="#6366f1" />
        </div>
        
        <h2>Admin</h2>
        <p>Ingresa tus credenciales</p>

        <form onSubmit={acceder} className="login-form">
          <input 
            type="email" 
            placeholder="Correo" 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            onChange={e => setPass(e.target.value)} 
            required 
          />
          <button type="submit" className="btn-login-submit">Entrar</button>
        </form>
      </div>
    </div>
  );
};

export default Login;