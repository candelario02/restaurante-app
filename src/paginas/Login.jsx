import React, { useState } from "react";
import { loginUsuario } from "../servicios/usuariosServicio";
import { Lock, Mail, LogIn, ShieldAlert } from "lucide-react";
import "../estilos/login.css";

function Login({ onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const { restauranteId, rol } = await loginUsuario(email, password);

      // 💾 Guardar sesión
      localStorage.setItem("esAdmin", "true");
      localStorage.setItem("restauranteId", restauranteId);
      localStorage.setItem("rolUsuario", rol);

      if (onSuccess) onSuccess({ restauranteId, rol, esAdmin: true });

      if (onSuccess) onSuccess(restauranteId);
      if (onClose) onClose();
    } catch (err) {
      if (err.message === "NO_AUTORIZADO") {
        setError("Acceso denegado");
      } else {
        setError("Correo o contraseña incorrectos");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-content">
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        {error ? (
          <ShieldAlert size={50} color="#ff4d4d" />
        ) : (
          <Lock size={50} color="#f6ad55" />
        )}
      </div>

      <form onSubmit={manejarLogin} className="login-form">
        <h2 className="titulo-principal">Acceso Panel</h2>

        <div className="input-group">
          <Mail size={18} className="input-icon" />
          <input
            type="email"
            placeholder="Correo"
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

        {error && <div className="mensaje-alerta error">{error}</div>}

        <button type="submit" className="btn-login-submit" disabled={cargando}>
          {cargando ? (
            "Entrando..."
          ) : (
            <>
              <LogIn size={18} /> Entrar
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default Login;
