import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/config";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import Swal from "sweetalert2";
import "../estilos/menuCliente.css";

import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Clock,
  Utensils,
  ChevronRight,
  Star,
  CheckCircle2,
} from "lucide-react";

// Servicios
import {
  obtenerProductos,
  obtenerConfigRestaurante,
} from "../servicios/productosServicio";

import {
  gestionarPedido,
  enviarResenaPedido,
} from "../servicios/pedidosServicio";

const MenuCliente = ({ restauranteId }) => {
  // --- ESTADOS ---
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true); // Estado de carga inicial
  const [categoriaActual, setCategoriaActual] = useState("Todos");
  const [carrito, setCarrito] = useState([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [avisoAgregado, setAvisoAgregado] = useState(null);
  const [logoRestaurante, setLogoRestaurante] = useState(
    "/logo_resturante.gif",
  );

  // Formulario Pedido
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState(""); // Referencia o Mesa
  const [tipoPedido, setTipoPedido] = useState("mesa");
  const [enviando, setEnviando] = useState(false);

  // Seguimiento Realtime
  const [pedidoActivoId, setPedidoActivoId] = useState(
    localStorage.getItem(`ultimoPedido_${restauranteId}`),
  );
  const [datosPedidoRealtime, setDatosPedidoRealtime] = useState(null);

  // Reseñas
  const [mostrarModalCalificacion, setMostrarModalCalificacion] =
    useState(false);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [total, setTotal] = useState(0);

  // --- EFECTOS ---

  // 1. Cargar Configuración y Productos (Coherencia con Servicios)
  useEffect(() => {
    if (!restauranteId || restauranteId === "undefined") return;

    setCargando(true);

    obtenerConfigRestaurante(restauranteId).then((config) => {
      if (config?.logoUrl) setLogoRestaurante(config.logoUrl);
    });
    const productosRef = collection(db, "productos");
    const q = query(productosRef, where("restauranteId", "==", restauranteId));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProductos(data.filter((p) => p.disponible !== false));
        setCargando(false);
      },
      (error) => {
        console.error("Error en Firebase Menu:", error);
        setCargando(false);
      },
    );

    return () => unsub();
  }, [restauranteId]);

  // 2. Seguimiento Realtime del Pedido Activo
  useEffect(() => {
    if (!pedidoActivoId || !restauranteId) {
      setDatosPedidoRealtime(null);
      return;
    }

    const pedidoRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "pedidos",
      pedidoActivoId,
    );

    const unsubscribe = onSnapshot(
      pedidoRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDatosPedidoRealtime({ id: docSnap.id, ...data });

          // Si el pedido se marca como 'entregado' y no ha calificado, mostrar modal
          if (data.estado === "entregado" && !data.calificado) {
            setMostrarModalCalificacion(true);
          }
        } else {
          // Si el pedido no existe (fue borrado), limpiamos
          setPedidoActivoId(null);
          localStorage.removeItem(`ultimoPedido_${restauranteId}`);
        }
      },
      (error) => {
        console.error("Error en Snapshot de pedido:", error);
      },
    );

    return () => unsubscribe();
  }, [pedidoActivoId, restauranteId]);

  // 3. Cálculo de Total (UseMemo es más eficiente aquí que useEffect)
  const totalCalculado = useMemo(() => {
    return carrito.reduce(
      (acc, item) => acc + (Number(item.precio) || 0) * (item.cantidad || 1),
      0,
    );
  }, [carrito]);

  // 4. Temporizador Aviso
  useEffect(() => {
    if (avisoAgregado) {
      const timer = setTimeout(() => setAvisoAgregado(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [avisoAgregado]);

  if (!restauranteId || cargando)
    return (
      <div className="loading-screen">Cargando menú del restaurante...</div>
    );

  // Funcion agregar al carrito
  const agregarAlCarrito = (producto) => {
    if (datosPedidoRealtime?.estado === "cocinando") {
      Swal.fire({
        title: "Cocina trabajando",
        text: "No puedes modificar el carrito mientras tu orden se está preparando.",
        icon: "info",
        confirmButtonColor: "#4CAF50",
      });
      return;
    }

    setAvisoAgregado(null);
    setTimeout(() => {
      setAvisoAgregado(`+ ${producto.nombre} añadido`);
    }, 10);

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
  // Funcion restar al carrito
  const restarAlCarrito = (id) => {
    if (datosPedidoRealtime?.estado === "cocinando") return;
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
    if (datosPedidoRealtime?.estado === "cocinando") return; // Bloqueo coherente
    const itemEliminado = carrito.find((item) => item.id === id);
    setCarrito((prev) => prev.filter((item) => item.id !== id));
    setAvisoAgregado(null);
    setTimeout(() => {
      setAvisoAgregado(`- ${itemEliminado?.nombre} quitado`);
    }, 10);
  };
  // Funcion enviar pedido
  const enviarPedidoFinal = async (datosCliente = null) => {
    if (carrito.length === 0 || enviando) return;

    try {
      setEnviando(true);
      const idExistente =
        pedidoActivoId || localStorage.getItem(`ultimoPedido_${restauranteId}`);

      const nuevosItems = carrito.map((item) => ({
        id: item.id,
        nombre: item.nombre,
        precio: Number(item.precio),
        cantidad: item.cantidad,
        subtotal: Number(item.precio) * item.cantidad,
      }));

      const totalCalculado = nuevosItems.reduce(
        (acc, curr) => acc + curr.subtotal,
        0,
      );

      let pedidoParaFirebase;

      if (idExistente && datosPedidoRealtime) {
        pedidoParaFirebase = {
          ...datosPedidoRealtime,
          items: nuevosItems,
          total: totalCalculado,
          estado: "pendiente",
        };
      } else {
        pedidoParaFirebase = {
          cliente: {
            nombre: datosCliente?.nombre || "Cliente",
            tipo: tipoPedido === "mesa" ? "Mesa" : "Delivery",
            referencia: datosCliente?.referencia || "",
            telefono: datosCliente?.telefono || "No provisto",
          },
          items: nuevosItems,
          total: totalCalculado,
          estado: "pendiente",
          fecha: new Date(),
          restauranteId: restauranteId,
        };
      }

      const idNuevo = await gestionarPedido(
        restauranteId,
        pedidoParaFirebase,
        idExistente,
      );

      await Swal.fire({
        title: "¡Éxito!",
        text: idExistente
          ? "Tu pedido ha sido actualizado."
          : "Orden enviada con éxito.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });

      setCarrito([]);
      setVerCarrito(false);
      setMostrarFormulario(false);

      if (!idExistente && idNuevo) {
        setPedidoActivoId(idNuevo);
        localStorage.setItem(`ultimoPedido_${restauranteId}`, idNuevo);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      Swal.fire("Aviso", error.message, "warning");
    } finally {
      setEnviando(false);
    }
  };

  // Funcion para calificar
  const finalizarYCalificar = async (numEstrellas, texto) => {
    if (!pedidoActivoId) return;

    try {
      await enviarResenaPedido(
        restauranteId,
        pedidoActivoId,
        numEstrellas,
        texto,
      );

      // Limpieza total del estado del cliente
      localStorage.removeItem(`ultimoPedido_${restauranteId}`);
      setPedidoActivoId(null);
      setDatosPedidoRealtime(null);
      setMostrarModalCalificacion(false);
      setEstrellas(0);
      setComentario("");

      Swal.fire({
        title: "¡Gracias!",
        text: "Tu opinión nos ayuda a mejorar.",
        icon: "success",
        confirmButtonColor: "#4CAF50",
      });
    } catch (error) {
      Swal.fire("Error", "No pudimos guardar tu reseña", "error");
    }
  };
  // Funcion para mostrar productos
  const productosParaMostrar = useMemo(() => {
    return productos.filter(
      (p) => p.categoria === categoriaActual && p.disponible !== false,
    );
  }, [productos, categoriaActual]);
  //funcion para seguimiento dinamico
  const getEtapa = (estado) => {
    const etapas = {
      pendiente: 1,
      cocinando: 2,
      entregado: 3,
    };
    return etapas[estado] || 1;
  };

  return (
    <div className="admin-container">
      {/* Mensaje de aviso) */}
      {avisoAgregado && (
        <div
          key={avisoAgregado}
          className={`toast-agregado ${avisoAgregado.startsWith("-") ? "toast-error" : ""}`}
        >
          <CheckCircle size={20} />
          <span>{avisoAgregado}</span>
        </div>
      )}

      {/* ✅ BOTÓN CARRITO FLOTANTE */}
      {carrito.length > 0 && !mostrarFormulario && (
        <button
          className="carrito-flotante"
          onClick={() => setVerCarrito(true)}
        >
          <span>🛒</span>
          {carrito.length > 0 && (
            <div className="contador-real">{carrito.length}</div>
          )}
        </button>
      )}

      {/* SESION CATEGORÍAS principal */}
      {!categoriaActual && (
        <div className="view-principal">
          <header className="menu-header-dinamico">
            <h1>
              {restauranteId
                ? restauranteId.replace(/_/g, " ").toUpperCase()
                : "NUESTRO MENÚ"}
            </h1>
          </header>

          <img
            src={logoRestaurante || "/logo_resturante.gif"}
            alt="logo restaurante"
            className="logo-circular"
            onError={(e) => (e.target.src = "/logo_resturante.gif")}
          />

          <h2 className="titulo-categoria">¿Qué deseas pedir hoy?</h2>

          <div className="categorias-grid-principal">
            <div
              className="cat-item"
              onClick={() => setCategoriaActual("Comidas")}
            >
              <Pizza size={60} className="icon-comidas" />
              <p>Comidas</p>
            </div>

            <div
              className="cat-item"
              onClick={() => setCategoriaActual("Cafeteria")}
            >
              <Coffee size={60} className="icon-cafeteria" />
              <p>Cafetería</p>
            </div>

            <div
              className="cat-item"
              onClick={() => setCategoriaActual("Bebidas")}
            >
              <Droplet size={60} className="icon-bebidas" />
              <p>Bebidas</p>
            </div>

            <div
              className="cat-item"
              onClick={() => setCategoriaActual("Entradas")}
            >
              <Utensils size={60} className="icon-entradas" />
              <p>Entradas</p>
            </div>
          </div>
        </div>
      )}

      {/* SESION DE PRODUCTOS */}
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
            <div className="header-categoria-spacer"></div>
          </div>

          {productosParaMostrar.length === 0 ? (
            <div className="no-data">
              <p>No hay productos disponibles en esta categoría por ahora.</p>
            </div>
          ) : (
            <div className="productos-grid">
              {productosParaMostrar.map((p) => (
                <div key={p.id} className="producto-card">
                  <div className="producto-imagen-wrapper">
                    <img
                      src={p.imagenUrl || "/placeholder-plato.png"}
                      alt={p.nombre}
                      loading="lazy"
                    />
                  </div>

                  <div className="producto-info">
                    <h3>{p.nombre}</h3>
                    {p.descripcion && (
                      <p className="descripcion-corta">{p.descripcion}</p>
                    )}

                    <p className="precio">
                      S/ {Number(p.precio || 0).toFixed(2)}
                    </p>

                    <button
                      className={`btn-agregar ${!p.disponible ? "agotado" : ""}`}
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
          )}
        </div>
      )}
      {/* SESION DE PEDIDO */}
      {pedidoActivoId && datosPedidoRealtime && (
        <div className="view-principal">
          <div className="seguimiento-box">
            <div className="seguimiento-header">
              <h3 className="titulo-categoria">Sigue tu Orden 🥣</h3>
              <div className="seguimiento-header-total">
                <span className="pedido-id-tag">
                  👤{" "}
                  {datosPedidoRealtime?.cliente?.nombre ||
                    `ID: #${pedidoActivoId?.slice(-5)}`}
                </span>
                <span className="seguimiento-total-text">
                  Total: S/ {Number(datosPedidoRealtime?.total || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="stepper-container">
              <div className="stepper-line"></div>

              {/* Paso 1: Recibido */}
              <div
                className={`step ${getEtapa(datosPedidoRealtime.estado) >= 1 ? "active" : ""} ${getEtapa(datosPedidoRealtime.estado) > 1 ? "completed" : ""}`}
              >
                <div className="step-circle">
                  {getEtapa(datosPedidoRealtime.estado) > 1 ? "✓" : "1"}
                </div>
                <span className="step-label">Recibido</span>
              </div>

              {/* Paso 2: Cocina */}
              <div
                className={`step ${getEtapa(datosPedidoRealtime.estado) >= 2 ? "active" : ""} ${getEtapa(datosPedidoRealtime.estado) > 2 ? "completed" : ""}`}
              >
                <div className="step-circle">
                  {getEtapa(datosPedidoRealtime.estado) > 2 ? "✓" : "2"}
                </div>
                <span className="step-label">Cocina</span>
              </div>

              {/* Paso 3: Entregado */}
              <div
                className={`step ${getEtapa(datosPedidoRealtime.estado) >= 3 ? "active" : ""}`}
              >
                <div className="step-circle">
                  {getEtapa(datosPedidoRealtime.estado) >= 3 ? "✓" : "3"}
                </div>
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

            <div className="seguimiento-acciones">
              {datosPedidoRealtime.estado === "entregado" ? (
                <button
                  className="btn-finalizar-calificar"
                  onClick={() => setMostrarModalCalificacion(true)}
                >
                  ⭐ Finalizar y Calificar
                </button>
              ) : (
                <button
                  className="btn-pedir-mas"
                  disabled={datosPedidoRealtime?.estado !== "pendiente"}
                  onClick={async () => {
                    if (datosPedidoRealtime?.estado !== "pendiente") {
                      Swal.fire(
                        "Aviso",
                        "Tu pedido ya está en cocina y no se pueden añadir más productos.",
                        "info",
                      );
                      return;
                    }

                    const { isConfirmed } = await Swal.fire({
                      title: "¡Perfecto!",
                      text: "Tu carrito se cargará con tu pedido actual para que puedas añadir algo más.",
                      icon: "info",
                      confirmButtonText: "Entendido",
                      confirmButtonColor: "#4CAF50",
                    });

                    if (isConfirmed) {
                      setCarrito([...datosPedidoRealtime.items]);
                      setVerCarrito(true);
                      setCategoriaActual(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
                  {datosPedidoRealtime?.estado === "pendiente"
                    ? "+ Pedir algo adicional"
                    : "👨‍🍳 Cocina trabajando..."}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* SESION DEL CARRITO */}
      {verCarrito && (
        <div className="carrito-overlay">
          <div className="carrito-modal">
            <div className="carrito-header">
              <h2>🛒 Tu Pedido</h2>
              <button
                className="btn-cerrar-x"
                onClick={() => setVerCarrito(false)}
              >
                ×
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
                      <span>S/ {Number(item.precio).toFixed(2)}</span>
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
                  className="btn-agregar-cerrar"
                  onClick={() => {
                    if (pedidoActivoId) {
                      setCarrito([]);
                    }
                    setVerCarrito(false);
                  }}
                >
                  {pedidoActivoId ? "Cancelar Cambios" : "Seguir Comprando"}
                </button>

                <button
                  className="btn-pagar"
                  disabled={carrito.length === 0 || enviando}
                  onClick={() => {
                    setVerCarrito(false);
                    if (pedidoActivoId) {
                      enviarPedidoFinal();
                    } else {
                      setMostrarFormulario(true);
                    }
                  }}
                >
                  {enviando
                    ? "Enviando..."
                    : pedidoActivoId
                      ? "🚀 Actualizar mi Pedido"
                      : "Confirmar Pedido"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SESION FORMULARIO DE ENTREGA */}
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
                      ? `Mesa ${formData.get("mesa")}`
                      : formData.get("direccion"),
                  telefono: formData.get("telefono") || "No provisto",
                });
              }}
            >
              <input
                name="nombre"
                placeholder="¿A nombre de quién?"
                required
                className="input-pro"
                autoFocus
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
                  min="1"
                  onKeyDown={(e) =>
                    ["e", "E", "+", "-", "."].includes(e.key) &&
                    e.preventDefault()
                  }
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
                    placeholder="WhatsApp (9 dígitos)"
                    required
                    className="input-pro"
                    type="tel"
                    pattern="[0-9]{9}"
                    onInput={(e) => {
                      e.target.value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 9);
                    }}
                  />
                </>
              )}

              <div className="acciones-form">
                <button
                  type="button"
                  className="btn-volver-minimal"
                  onClick={() => setMostrarFormulario(false)}
                  disabled={enviando}
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  className="btn-finalizar-pedido"
                  disabled={enviando}
                >
                  {enviando
                    ? "Procesando..."
                    : pedidoActivoId
                      ? "Añadir al Pedido"
                      : "🚀 Confirmar Orden"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SESION Modal de Calificación */}
      {mostrarModalCalificacion && (
        <div className="modal-overlay">
          <div className="modal-content-calificacion">
            <h3>¿Qué te pareció tu pedido?</h3>
            <p className="subtitulo-modal">Tu opinión nos ayuda a mejorar</p>

            <div className="estrellas-container">
              {[1, 2, 3, 4, 5].map((num) => (
                <span
                  key={num}
                  className="estrella-span"
                  style={{
                    color: num <= estrellas ? "#ffc107" : "#ccc",
                    fontSize: "2.5rem",
                    cursor: "pointer",
                  }}
                  onClick={() => setEstrellas(num)}
                >
                  {num <= estrellas ? "★" : "☆"}
                </span>
              ))}
            </div>

            <textarea
              className="input-resena"
              placeholder="Cuéntanos tu experiencia (opcional)..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              maxLength="200"
            />

            <div className="contenedor-botones-modal">
              <button
                className="btn-enviar-resena"
                disabled={estrellas === 0 || enviando}
                onClick={() => finalizarYCalificar(estrellas, comentario)}
              >
                {enviando ? "Guardando..." : "Enviar y Finalizar"}
              </button>

              <button
                className="btn-omitir"
                disabled={enviando}
                onClick={() => {
                  localStorage.removeItem(`ultimoPedido_${restauranteId}`);
                  setPedidoActivoId(null);
                  setDatosPedidoRealtime(null);
                  setMostrarModalCalificacion(false);
                }}
              >
                Omitir por ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCliente;
