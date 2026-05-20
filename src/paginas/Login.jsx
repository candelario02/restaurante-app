import React, { useState } from "react";
import { loginUsuario } from "../servicios/usuariosServicio";
import { Lock, Mail, LogIn, ShieldAlert } from "lucide-react";
import "../estilos/login.css";

function Login({ onClose, onSuccess, restauranteId }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const datosUsuario = await loginUsuario(email, password, restauranteId);

      const { restauranteId: idRestaurante, rol } = datosUsuario;

      if (!idRestaurante || !rol) {
        throw new Error("DATOS_INCOMPLETOS");
      }

      localStorage.setItem("esAdmin", "true");
      localStorage.setItem("restauranteId", idRestaurante);
      localStorage.setItem("rolUsuario", rol);

      if (onSuccess) {
        onSuccess({
          restauranteId: idRestaurante,
          rol,
          esAdmin: true,
        });
      }

      if (onClose) onClose();
    } catch (err) {
      console.error("Error en el flujo de Login:", err);

      const errorCode = err.code || err.message;

      const mensajesError = {
        NO_AUTORIZADO: "No tienes permisos para acceder a este panel.",
        "auth/user-not-found": "El correo no está registrado.",
        "auth/wrong-password": "La contraseña es incorrecta.",
        "auth/invalid-email": "El formato del correo no es válido.",
        "auth/too-many-requests": "Demasiados intentos. Intenta más tarde.",
        DATOS_INCOMPLETOS: "Tu perfil no tiene un restaurante asignado.",
      };

      setError(
        mensajesError[errorCode] ||
          "Error de credenciales. Revisa e intenta de nuevo.",
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-content">
      <div className="login-icon-wrapper">
        {error ? (
          <ShieldAlert size={50} color="#ff4d4d" className="animar-error" />
        ) : (
          <Lock size={50} color="#f6ad55" />
        )}
      </div>

      <form onSubmit={manejarLogin} className="login-form">
        <h2 className="titulo-principal">Acceso Panel</h2>
        <p className="subtitulo-login">
          Ingresa tus credenciales de{" "}
          {email.includes("@admin") ? "Administrador" : "Personal"}
        </p>

        <div className="input-group">
          <Mail size={18} className="input-icon" />
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-pro"
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
            className="input-pro"
          />
        </div>

        {error && (
          <div className="mensaje-alerta error-login">
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className={`btn-login-submit ${cargando ? "cargando" : ""}`}
          disabled={cargando}
        >
          {cargando ? (
            <span className="spinner"></span>
          ) : (
            <>
              <LogIn size={18} />
              <span>Entrar al Sistema</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default Login;
