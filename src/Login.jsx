import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const Login = ({ alCerrar }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const acceder = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      alCerrar(); // Cierra el login al tener éxito
    } catch (error) {
      alert("Credenciales incorrectas");
    }
  };

  return (
    <div style={{padding: '40px 20px', textAlign: 'center'}}>
      <h2>Acceso Administrador</h2>
      <form onSubmit={acceder} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
        <input type="email" placeholder="Correo" onChange={e => setEmail(e.target.value)} style={{padding: '12px', borderRadius: '8px', border: '1px solid #ddd'}} />
        <input type="password" placeholder="Contraseña" onChange={e => setPass(e.target.value)} style={{padding: '12px', borderRadius: '8px', border: '1px solid #ddd'}} />
        <button type="submit" style={{padding: '15px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px'}}>Entrar</button>
        <button type="button" onClick={alCerrar} style={{background: 'none', border: 'none', color: '#666'}}>Volver al Menú</button>
      </form>
    </div>
  );
};

export default Login;