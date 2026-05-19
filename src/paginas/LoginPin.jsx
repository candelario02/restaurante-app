import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth } from "../firebase/config";
import { db } from "../firebase/config";
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
      // 🔍 Buscamos en la colección de usuarios de este restaurante a quién le pertenece este PIN
      const usuariosRef = collection(
        db,
        "restaurantes",
        restauranteId,
        "usuarios_admin",
      );
      const q = query(usuariosRef, where("pin", "==", pinAValidar));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // ¡Encontrado! Tomamos el primer usuario que coincida con ese PIN
        const datosEmpleado = querySnapshot.docs[0].data();

        setPin("");
        onConfirmar(datosEmpleado); // Enviamos los datos del mozo o cajero activo a App.jsx
      } else {
        // Si nadie tiene ese PIN
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
        {/* Opción 1: Título 100% dinámico y empático */}
        <h2 className="pin-title">
          {verificando ? "✨ Procesando..." : `👋 ¡Hola, ${nombreParaMostrar}!`}
        </h2>

        {/* Opción 2: Subtítulo dinámico con instrucciones en tiempo real */}
        <p className="pin-subtitle">
          {pin.length === 4
            ? "🔒 Validando tu código de seguridad..."
            : pin.length > 0
              ? `Ingresando dígitos... (${pin.length} de 4)`
              : "Por favor, introduce tu PIN de 4 dígitos para continuar"}
        </p>

        {/* Visualizador de esferas/puntos de contraseña - IDÉNTICO SIN CAMBIAR ESTILOS */}
        <div className="pin-display">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`pin-dot ${pin.length > i ? "filled" : ""} ${error ? "error" : ""}`}
            />
          ))}
        </div>

        {/* Opción 3: Mensajes informativos de error y éxito de manera profesional */}
        {error && (
          <p className="pin-error-text" style={{ fontWeight: "600" }}>
            ❌ PIN incorrecto para la cuenta {nombreParaMostrar}. Inténtalo de
            nuevo.
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

        {/* Teclado Numérico Táctil - SE MANTIENE INTACTO PARA NO ROMPER LA INTERFAZ */}
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
