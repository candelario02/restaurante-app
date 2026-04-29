import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import Swal from "sweetalert2";
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
  Trash2,
} from "lucide-react";

const MenuCliente = ({ restauranteId }) => {
  if (!restauranteId)
    return <div className="loading-screen">Cargando menú...</div>;

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
  const [pedidoActivo, setPedidoActivo] = useState(null);

  const [total, setTotal] = useState(0);

  const [pedidoActivoId, setPedidoActivoId] = useState(
    localStorage.getItem(`ultimoPedido_${restauranteId}`),
  );
  const [datosPedidoRealtime, setDatosPedidoRealtime] = useState(null);
  // useEffect Config restaurante
  useEffect(() => {
    if (!restauranteId) return;

    const cargarConfig = async () => {
      const config = await obtenerConfigRestaurante(restauranteId);
      if (config?.logoUrl) {
        setLogoRestaurante(config.logoUrl);
      }
    };
    cargarConfig();
  }, [restauranteId]);

  //Efecto de productos Productos
  useEffect(() => {
    if (!restauranteId || !categoriaActual) return;

    const unsub = obtenerProductos(
      restauranteId,
      categoriaActual,
      setProductos,
    );

    return () => unsub();
  }, [categoriaActual, restauranteId]);

  // Efecto Seguimiento pedido
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
  // Efecto escuchar cambios en el pedido en tiempo real
  useEffect(() => {
    if (!pedidoActivoId || !restauranteId) return;

    const pedidoRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "pedidos",
      pedidoActivoId,
    );

    const unsubscribe = onSnapshot(pedidoRef, (docSnap) => {
      if (docSnap.exists()) {
        setPedidoActivo(docSnap.data());
      } else {
        setPedidoActivoId(null);
        setPedidoActivo(null);
        localStorage.removeItem(`ultimoPedido_${restauranteId}`);
      }
    });

    return () => unsubscribe();
  }, [pedidoActivoId, restauranteId]);

  const getEtapa = (estado) => {
    const etapas = { pendiente: 1, cocinando: 2, entregado: 3 };
    return etapas[estado] || 1;
  };

  //Efecto para calcular el total automáticamente
  useEffect(() => {
    const nuevoTotal = carrito.reduce((acc, item) => {
      return acc + (Number(item.precio) || 0) * (item.cantidad || 1);
    }, 0);
    setTotal(nuevoTotal);
  }, [carrito]);
  //Efecto para limpiar el aviso de agregado
  useEffect(() => {
    if (avisoAgregado) {
      const timer = setTimeout(() => setAvisoAgregado(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [avisoAgregado]);
  //funcion agregar al carrito
  const agregarAlCarrito = (producto) => {
    setAvisoAgregado(producto.nombre);
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
  //funcion enviar pedido
  const enviarPedidoFinal = async (datosCliente) => {
    if (carrito.length === 0 || enviando) return;
    try {
      setEnviando(true);
      const pedidoParaFirebase = {
        cliente: {
          nombre: datosCliente.nombre,
          tipo: datosCliente.tipo,
          referencia: datosCliente.referencia,
          telefono: datosCliente.telefono || "No provisto",
        },
        items: carrito.map((item) => ({
          id: item.id,
          nombre: item.nombre,
          precio: Number(item.precio),
          cantidad: item.cantidad,
          subtotal: Number(item.precio) * item.cantidad,
        })),
        total: total,
        estado: "pendiente",
        restauranteId: restauranteId,
        fecha: new Date().toISOString(),
      };

      const idPedido = await crearPedido(restauranteId, pedidoParaFirebase);
      localStorage.setItem(`ultimoPedido_${restauranteId}`, idPedido);
      setPedidoActivoId(idPedido);
      setCarrito([]);
      setMostrarFormulario(false);
      setVerCarrito(false);

      Swal.fire("¡Pedido Enviado!", "Tu orden está en cocina.", "success");
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No pudimos procesar tu pedido.", "error");
    } finally {
      setEnviando(false);
    }
  };
  //funcion restar el carrito
  const restarAlCarrito = (id) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.id === id && item.cantidad > 1
          ? { ...item, cantidad: item.cantidad - 1 }
          : item,
      ),
    );
  };
  //funcion borra dell carrito
  const eliminarDelCarrito = (id) => {
    const itemEliminado = carrito.find((item) => item.id === id);
    setCarrito((prev) => prev.filter((item) => item.id !== id));
    setAvisoAgregado(`${itemEliminado.nombre} eliminado`);
  };
//funcion para seguimiento dinamico
  const getEtapa = (estado) => {
    switch (estado) {
      case "pendiente":
        return 1;
      case "cocinando":
        return 2;
      case "entregado":
        return 3;
      default:
        return 1;
    }
  };
  return (
    <div className="admin-container">
      {/* Mensaje de aviso al centro) */}
      {avisoAgregado && (
        <div className="toast-agregado">
          <CheckCircle size={20} />
          <span>{avisoAgregado} agregado</span>
        </div>
      )}

      {/* ✅ BOTÓN CARRITO FLOTANTE */}
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

      {/* ✅ SEGUIMIENTO DE PEDIDO  */}
      {pedidoActivoId && datosPedidoRealtime && (
        <div className="view-principal">
          <div className="seguimiento-box">
            <div className="seguimiento-header">
              <h3 className="titulo-categoria">Sigue tu Orden 🥣</h3>
              <span className="pedido-id-tag">
                ID: #{pedidoActivoId.slice(-5)}
              </span>
            </div>

            <div className="stepper-container">
              <div className="stepper-line"></div>

              <div
                className={`step ${getEtapa(datosPedidoRealtime.estado) >= 1 ? "active" : ""} ${getEtapa(datosPedidoRealtime.estado) > 1 ? "completed" : ""}`}
              >
                <div className="step-circle">
                  {getEtapa(datosPedidoRealtime.estado) > 1 ? "✓" : "1"}
                </div>
                <span className="step-label">Recibido</span>
              </div>

              <div
                className={`step ${getEtapa(datosPedidoRealtime.estado) >= 2 ? "active" : ""} ${getEtapa(datosPedidoRealtime.estado) > 2 ? "completed" : ""}`}
              >
                <div className="step-circle">
                  {getEtapa(datosPedidoRealtime.estado) > 2 ? "✓" : "2"}
                </div>
                <span className="step-label">Cocina</span>
              </div>

              <div
                className={`step ${getEtapa(datosPedidoRealtime.estado) >= 3 ? "active" : ""}`}
              >
                <div className="step-circle">3</div>
                <span className="step-label">Entregado</span>
              </div>
            </div>

            <p className="seguimiento-footer-msg">
              {datosPedidoRealtime.estado === "pendiente" &&
                "Estamos validando tu pedido..."}
              {datosPedidoRealtime.estado === "cocinando" &&
                "¡Tu orden está en el fuego! 🔥"}
              {datosPedidoRealtime.estado === "entregado" &&
                "¡Listo! Que lo disfrutes."}
            </p>

            <button
              className="btn-pedir-mas"
              onClick={() => setPedidoActivoId(null)}
            >
              + Pedir algo adicional
            </button>
          </div>
        </div>
      )}

      {/* ✅ VISTA DE CATEGORÍAS principal*/}
      {!pedidoActivoId && !categoriaActual && (
        <div className="view-principal">
          <header className="menu-header-dinamico">
            <h1>
              {restauranteId
                ? restauranteId.replace(/_/g, " ").toUpperCase()
                : "BIENVENIDO"}
            </h1>
          </header>

          <img
            src={logoRestaurante}
            alt="logo"
            className="logo-circular"
            style={{ width: 80, borderRadius: "50%", marginBottom: "15px" }}
          />
          <h2 className="titulo-categoria">¿Qué deseas pedir hoy?</h2>

          <div className="categorias-grid-principal">
            <div onClick={() => setCategoriaActual("Comidas")}>
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

      {/* ✅ VISTA DE PRODUCTOS alineación Volver + Título */}
      {categoriaActual && (
        <div className="admin-container">
          <div className="header-categoria">
            <button
              className="btn-volver-minimal"
              onClick={() => setCategoriaActual(null)}
            >
              <ArrowLeft size={18} /> Volver
            </button>
            <h2 className="titulo-categoria">{categoriaActual}</h2>
            <div style={{ width: "80px" }}></div>{" "}
          </div>

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
                        <Plus size={18} />
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
        </div>
      )}

      {/* ✅ MODAL DEL CARRITO */}
      {verCarrito && (
        <div className="carrito-overlay">
          <div className="carrito-modal">
            <div className="carrito-header">
              <h2>🛒 Tu Pedido</h2>
              <button
                className="btn-eliminar-item"
                style={{ background: "transparent" }}
                onClick={() => setVerCarrito(false)}
              >
                ✕
              </button>
            </div>

            <div className="carrito-items">
              {carrito.length === 0 ? (
                <div className="carrito-vacio-msg">
                  <p>Tu carrito está vacío</p>
                </div>
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
                <span>Total:</span>
                <span className="total-monto">S/ {total.toFixed(2)}</span>
              </div>

              <div className="carrito-acciones">
                <button
                  className="btn-agregar"
                  style={{ background: "#666" }}
                  onClick={() => setVerCarrito(false)}
                >
                  Cerrar
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

      {/* ✅ FORMULARIO DE ENTREGA */}
      {mostrarFormulario && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2 className="titulo-categoria" style={{ marginBottom: "20px" }}>
              Datos de Entrega
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                enviarPedidoFinal({
                  nombre: formData.get("nombre"),
                  tipo: tipoPedido,
                  referencia:
                    tipoPedido === "mesa"
                      ? formData.get("mesa")
                      : formData.get("direccion"),
                  telefono: formData.get("telefono"),
                });
              }}
            >
              <input
                name="nombre"
                placeholder="¿Tu nombre?"
                required
                className="input-pro"
              />

              <select
                className="input-pro"
                value={tipoPedido}
                onChange={(e) => setTipoPedido(e.target.value)}
              >
                <option value="mesa">Comer en el local (Mesa)</option>
                <option value="delivery">Para llevar / Delivery</option>
              </select>

              {tipoPedido === "mesa" ? (
                <input
                  name="mesa"
                  placeholder="Nro. de Mesa"
                  required
                  className="input-pro"
                  type="number"
                />
              ) : (
                <>
                  <input
                    name="direccion"
                    placeholder="Dirección de entrega"
                    required
                    className="input-pro"
                  />
                  <input
                    name="telefono"
                    placeholder="WhatsApp / Teléfono"
                    required
                    className="input-pro"
                    type="tel"
                  />
                </>
              )}

              <div className="acciones-form">
                <button
                  type="button"
                  className="btn-volver-minimal"
                  onClick={() => setMostrarFormulario(false)}
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  className="btn-finalizar-pedido"
                  disabled={enviando}
                >
                  {enviando ? "Enviando..." : "Finalizar Pedido"}
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
