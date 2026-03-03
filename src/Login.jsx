import React, { useState } from 'react';
import { auth, db } from './firebase'; 
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Lock, Mail, LogIn, ShieldAlert } from 'lucide-react';

// 🔐 Solo los Dueños del Sistema (Superadmins)
const SUPERADMIN_CONFIG = {
  'huamancarrioncande24@gmail.com': { restauranteId: 'restaurante_cande', rol: 'superadmin' },
  'jec02021994@gmail.com': { restauranteId: 'jekito_restobar', rol: 'superadmin' }
};

function Login({ onClose, onSuccess }) {
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
        // 3. Buscar en la colección de usuarios_admin (Mozos/Admins registrados)
        const q = query(collection(db, "usuarios_admin"), where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const datos = querySnapshot.docs[0].data();
          restauranteIdFinal = datos.restauranteId;
          rolFinal = datos.rol; // 'admin' o 'mozo'
        }
      }

      // 4. Si no encontramos vinculación, cerramos sesión inmediatamente
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

      // 6. Ejecutar éxito (Esto activa el panel en App_Sistema)
      if (onSuccess) {
        onSuccess(restauranteIdFinal); 
      }
      
      if (onClose) {
        onClose();
      }

    } catch (err) {
      console.error("Error en login:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
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
          <ShieldAlert size={50} color="#ff4d4d" />
        ) : (
          <Lock size={50} color="#f6ad55" />
        )}
      </div>

      <div className="header-brand" style={{ textAlign: 'center', marginBottom: '25px' }}>
        <h2 className="titulo-principal" style={{ fontSize: '1.8rem', margin: 0 }}>Acceso Panel</h2>
        <p className="text-muted" style={{ marginTop: '5px' }}>Ingresa tus credenciales autorizadas</p>
      </div>

      <form onSubmit={manejarLogin} className="login-form">
        <div className="input-group" style={{ marginBottom: '15px', position: 'relative' }}>
          <Mail size={18} className="input-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#718096' }} />
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
        </div>

        <div className="input-group" style={{ marginBottom: '20px', position: 'relative' }}>
          <Lock size={18} className="input-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#718096' }} />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          />
        </div>

        {error && (
          <div className="mensaje-alerta error" style={{ 
            padding: '10px', 
            fontSize: '0.85rem', 
            backgroundColor: '#fff5f5', 
            color: '#c53030', 
            borderRadius: '6px',
            marginBottom: '15px',
            border: '1px solid #feb2b2',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <button 
          type="submit" 
          className={`btn-login-submit ${cargando ? 'btn-loading' : ''}`} 
          disabled={cargando}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#f6ad55',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: cargando ? 'not-allowed' : 'pointer'
          }}
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