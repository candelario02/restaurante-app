import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import "../estilos/loginPin.css";

function LoginPin({ restauranteId, user, onConfirmar }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      validarPin(pin);
    }
  }, [pin]);

  const validarPin = async (pinAValidar) => {
    setVerificando(true);
    setError(null);
    try {
      // 🔍 Buscamos en la subcolección de este restaurante al usuario con este PIN
      const usuariosRef = collection(
        db,
        "restaurantes",
        restauranteId,
        "usuarios_admin",
      );

      // NOTA: Asegúrate de que en Firestore el campo esté guardado tal cual se envíe ('pin')
      const q = query(usuariosRef, where("pin", "==", pinAValidar));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // ¡Encontrado! Tomamos el primer usuario que coincida
        const datosEmpleado = querySnapshot.docs[0].data();

        setPin("");
        // 🚀 Enviamos los datos completos del mozo o cajero a App.jsx
        onConfirmar(datosEmpleado);
      } else {
        setError("PIN incorrecto. Intente nuevamente.");
        setPin("");
      }
    } catch (err) {
      console.error("Error al verificar PIN global:", err);
      setError("Error de autenticación o permisos insuficientes.");
      setPin("");
    } finally {
      setVerificando(false);
    }
  };

  const controlarClickTeclado = (valor) => {
    if (verificando) return;
    setError(null);
    if (valor === "C") {
      setPin("");
    } else if (pin.length < 4) {
      setPin((prev) => prev + valor);
    }
  };

  const nombreParaMostrar = user?.email
    ? user.email.split("@")[0].charAt(0).toUpperCase() +
      user.email.split("@")[0].slice(1)
    : "Operador";

  return (
    <div className="pin-screen-container">
      <div className="pin-box">
        <h2 className="pin-title">
          {verificando ? "✨ Procesando..." : `👋 ¡Hola, ${nombreParaMostrar}!`}
        </h2>

        <p className="pin-subtitle">
          {pin.length === 4
            ? "🔒 Validando tu código de seguridad..."
            : pin.length > 0
              ? `Ingresando dígitos... (${pin.length} de 4)`
              : "Por favor, introduce tu PIN de 4 dígitos para continuar"}
        </p>

        <div className="pin-display">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`pin-dot ${pin.length > i ? "filled" : ""} ${error ? "error" : ""}`}
            />
          ))}
        </div>

        {error && (
          <p className="pin-error-text" style={{ fontWeight: "600" }}>
            ❌ {error}
          </p>
        )}

        {verificando && (
          <p
            className="pin-loading-text"
            style={{ color: "#6366f1", fontWeight: "600" }}
          >
            ⚡ Verificando credenciales en el sistema...
          </p>
        )}

        <div className="pin-keyboard">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="btn-pin"
              onClick={() => controlarClickTeclado(num.toString())}
            >
              {num}
            </button>
          ))}
          <button
            className="btn-pin btn-clear"
            onClick={() => controlarClickTeclado("C")}
          >
            C
          </button>
          <button
            className="btn-pin"
            onClick={() => controlarClickTeclado("0")}
          >
            0
          </button>
          <div className="btn-pin-placeholder"></div>
        </div>
      </div>
    </div>
  );
}

export default LoginPin;
