import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import "../estilos/menuCliente.css";

import {
  obtenerProductos,
  obtenerConfigRestaurante,
} from "../servicios/productosServicio";

import { crearPedido } from "../servicios/pedidosServicio";

import {
  Utensils,
  Coffee,
  Pizza,
  Droplet,
  ArrowLeft,
  ShoppingCart,
  User,
  Phone,
  MapPin,
  Plus,
  CheckCircle,
  Clock,
  ChefHat,
  Truck,
} from "lucide-react";

const MenuCliente = ({ restauranteId = "jekito_restobar" }) => {
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [avisoAgregado, setAvisoAgregado] = useState(null);
  const [logoRestaurante, setLogoRestaurante] = useState(
    "/logo_resturante.gif",
  );

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [tipoPedido, setTipoPedido] = useState("mesa");
  const [enviando, setEnviando] = useState(false);

  const [pedidoActivoId, setPedidoActivoId] = useState(
    localStorage.getItem(`ultimoPedido_${restauranteId}`),
  );
  const [datosPedidoRealtime, setDatosPedidoRealtime] = useState(null);

  // 🔥 Config restaurante
  useEffect(() => {
    const cargarConfig = async () => {
      const config = await obtenerConfigRestaurante(restauranteId);
      if (config?.logoUrl) {
        setLogoRestaurante(config.logoUrl);
      }
    };
    cargarConfig();
  }, [restauranteId]);

  // 🔥 Productos
  useEffect(() => {
    if (!categoriaActual) return;

    const unsub = obtenerProductos(
      restauranteId,
      categoriaActual,
      setProductos,
    );

    return () => unsub();
  }, [categoriaActual, restauranteId]);

  // 🔥 Seguimiento pedido
  useEffect(() => {
    if (!pedidoActivoId) return;

    const unsub = onSnapshot(
      doc(db, "restaurantes", restauranteId, "pedidos", pedidoActivoId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDatosPedidoRealtime(data);

          if (data.estado === "entregado") {
            setTimeout(() => {
              setPedidoActivoId(null);
              localStorage.removeItem(`ultimoPedido_${restauranteId}`);
              setDatosPedidoRealtime(null);
            }, 15000);
          }
        }
      },
    );

    return () => unsub();
  }, [pedidoActivoId, restauranteId]);

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existe = prev.find((item) => item.id === producto.id);

      if (existe) {
        return prev.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const restarAlCarrito = (id) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.id === id && item.cantidad > 1
          ? { ...item, cantidad: item.cantidad - 1 }
          : item,
      ),
    );
  };

  const eliminarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };
  const total = carrito.reduce((acc, item) => {
    const precio = Number(item.precio) || 0;
    const cantidad = Number(item.cantidad) || 1;
    return acc + precio * cantidad;
  }, 0);

  const enviarPedidoFinal = async (datosCliente) => {
    try {
      if (carrito.length === 0) return alert("El carrito está vacío");

      const pedidoParaFirebase = {
        cliente: datosCliente,
        items: carrito,
        total: total,
        restauranteId: restauranteId,
      };

      const idPedido = await crearPedido(restauranteId, pedidoParaFirebase);

      alert("¡Pedido enviado con éxito! ID: " + idPedido);

      setCarrito([]);
      setMostrarFormulario(false);
      setVerCarrito(false);
    } catch (error) {
      alert("Error al enviar pedido: " + error.message);
    }
  };

  return (
    <div className="admin-container">
      {/* ✅ TOAST */}
      {avisoAgregado && (
        <div className="toast-agregado">
          <CheckCircle size={18} /> {avisoAgregado} agregado
        </div>
      )}

      {/* ✅ BOTÓN CARRITO */}
      {carrito.length > 0 &&
        !verCarrito &&
        !mostrarFormulario &&
        !pedidoActivoId && (
          <button
            className="btn-carrito-flotante"
            onClick={() => setVerCarrito(true)}
          >
            <ShoppingCart size={20} />
            <span>Ver Mi Orden (S/ {total.toFixed(2)})</span>
          </button>
        )}

      {/* ✅ SEGUIMIENTO */}
      {pedidoActivoId && datosPedidoRealtime && (
        <div className="view-principal">
          <h2>Estado: {datosPedidoRealtime.estado}</h2>
        </div>
      )}

      {/* ✅ CATEGORÍAS */}
      {!pedidoActivoId && !categoriaActual && (
        <div className="view-principal">
          <img
            src={logoRestaurante}
            alt="logo"
            style={{ width: 80, borderRadius: "50%" }}
          />
          <h2>¿Qué deseas?</h2>

          <div className="categorias-grid-principal">
            <div onClick={() => setCategoriaActual("Menu")}>
              <Pizza size={60} className="icon-comidas" />
              <p>Comidas</p>
            </div>

            <div onClick={() => setCategoriaActual("Cafeteria")}>
              <Coffee size={60} className="icon-cafeteria" />
              <p>Cafetería</p>
            </div>

            <div onClick={() => setCategoriaActual("Bebidas")}>
              <Droplet size={60} className="icon-bebidas" />
              <p>Bebidas</p>
            </div>

            <div onClick={() => setCategoriaActual("Entradas")}>
              <Utensils size={60} className="icon-entradas" />
              <p>Entradas</p>
            </div>
          </div>
        </div>
      )}

      {categoriaActual && (
        <>
          <button onClick={() => setCategoriaActual(null)}>
            <ArrowLeft /> Volver
          </button>
          <div className="productos-grid">
            {productos.map((p) => (
              <div
                key={p.id}
                className={`producto-card ${!p.disponible ? "agotado" : ""}`}
              >
                <img src={p.imagenUrl || "placeholder.png"} alt={p.nombre} />

                <div className="producto-info">
                  <h3>{p.nombre}</h3>
                  <p className="precio">S/ {Number(p.precio).toFixed(2)}</p>

                  <button
                    className="btn-agregar"
                    onClick={() => agregarAlCarrito(p)}
                    disabled={!p.disponible} 
                  >
                    {p.disponible ? (
                      <>
                        <Plus size={20} />
                        <span>Agregar</span>
                      </>
                    ) : (
                      <span>Agotado</span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ✅ CARRITO */}
      {verCarrito && (
        <div className="carrito-overlay">
          <div className="carrito-modal">
            <div className="carrito-header">
              <h2>🛒 Tu Pedido</h2>
              <button
                className="btn-cerrar"
                onClick={() => setVerCarrito(false)}
              >
                ✕
              </button>
            </div>

            <div className="carrito-items">
              {carrito.length === 0 ? (
                <p className="carrito-vacio">El carrito está vacío</p>
              ) : (
                carrito.map((item) => (
                  <div key={item.id} className="carrito-item">
                    <div className="item-info">
                      <h4>{item.nombre}</h4>
                      <span>S/ {item.precio.toFixed(2)}</span>
                    </div>

                    <div className="item-controles">
                      <button onClick={() => restarAlCarrito(item.id)}>
                        -
                      </button>
                      <span className="item-cantidad">{item.cantidad}</span>
                      <button onClick={() => agregarAlCarrito(item)}>+</button>

                      <button
                        className="btn-eliminar-item"
                        onClick={() => eliminarDelCarrito(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="carrito-footer">
              <div className="total-container">
                <span>Total a pagar:</span>
                <span className="total-monto">S/ {total.toFixed(2)}</span>
              </div>

              <div className="carrito-acciones">
                <button
                  className="btn-continuar"
                  onClick={() => setVerCarrito(false)}
                >
                  Seguir Comprando
                </button>
                <button
                  className="btn-pagar"
                  disabled={carrito.length === 0}
                  onClick={() => {
                    setVerCarrito(false);
                    setMostrarFormulario(true);
                  }}
                >
                  Confirmar Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Si el formulario está activo, mostramos la toma de datos */}
      {mostrarFormulario && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2>Datos de Entrega</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                enviarPedidoFinal({
                  nombre: formData.get("nombre"),
                  referencia: formData.get("referencia"),
                });
              }}
            >
              <input
                name="nombre"
                placeholder="¿A nombre de quién?"
                required
                className="input-pro"
              />
              <input
                name="referencia"
                placeholder="Mesa o Dirección"
                required
                className="input-pro"
              />

              <div className="acciones-form">
                <button
                  type="button"
                  onClick={() => setMostrarFormulario(false)}
                >
                  Atrás
                </button>
                <button type="submit" className="btn-confirmar">
                  Finalizar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCliente;
