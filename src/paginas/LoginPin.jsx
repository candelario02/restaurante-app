import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config"; // Ajusta la ruta según tu estructura
import "../estilos/loginPin.css";

function LoginPin({ restauranteId, onConfirmar }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [verificando, setVerificando] = useState(false);

  // Cada vez que el PIN llegue a 4 dígitos, lo validamos automáticamente
  useEffect(() => {
    if (pin.length === 4) {
      validarPin(pin);
    }
  }, [pin]);

  // ⌨️ ESCUCHADOR DE TECLADO FÍSICO DE PC
  useEffect(() => {
    const manejarTecladoFisico = (e) => {
      if (verificando) return;

      // Si presiona un número (0-9) ya sea del teclado superior o del pad numérico
      if (/^[0-9]$/.test(e.key)) {
        setError(null);
        if (pin.length < 4) {
          setPin((prev) => prev + e.key);
        }
      }

      // Si presiona retroceso (Backspace) o la tecla Suprimir (Delete), actúa como el botón "C"
      if (
        e.key === "Backspace" ||
        e.key === "Delete" ||
        e.key.toLowerCase() === "c"
      ) {
        setError(null);
        setPin("");
      }
    };

    window.addEventListener("keydown", manejarTecladoFisico);

    // Limpieza del evento al desmontar el componente para evitar fugas de memoria
    return () => {
      window.removeEventListener("keydown", manejarTecladoFisico);
    };
  }, [pin, verificando]);

  const validarPin = async (pinAValidar) => {
    setVerificando(true);
    setError(null);
    try {
      // 🕵️‍♂️ CORRECCIÓN PROFESIONAL: Apuntamos exactamente a tu subcolección de usuarios_admin
      const usuariosRef = collection(
        db,
        "restaurantes",
        restauranteId,
        "usuarios_admin",
      );
      const q = query(usuariosRef, where("pin", "==", pinAValidar));

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Encontrado con éxito
        const datosEmpleado = querySnapshot.docs[0].data();
        setPin("");
        onConfirmar(datosEmpleado); // Pasa los datos (email, rol, pin) a App.jsx
      } else {
        setError("PIN incorrecto. Intente nuevamente.");
        setPin("");
      }
    } catch (err) {
      console.error("Error al verificar PIN:", err);
      setError("Error de conexión con el servidor.");
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

  return (
    <div className="pin-screen-container">
      <div className="pin-box">
        <h2 className="pin-title">🔒 Control de Operador</h2>
        <p className="pin-subtitle">Ingrese su PIN de 4 dígitos para acceder</p>

        {/* Visualizador de esferas/puntos de contraseña */}
        <div className="pin-display">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`pin-dot ${pin.length > i ? "filled" : ""} ${error ? "error" : ""}`}
            />
          ))}
        </div>

        {error && <p className="pin-error-text">{error}</p>}
        {verificando && (
          <p className="pin-loading-text">Verificando credenciales...</p>
        )}

        {/* Teclado Numérico Táctil */}
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
