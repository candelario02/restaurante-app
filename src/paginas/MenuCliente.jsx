import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/config";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
} from "firebase/firestore";
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
  ArrowLeft,
  Pizza,
  Coffee,
  Droplet,
  CheckCircle,
  UtensilsCrossed,
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

const MenuCliente = ({ restauranteId, logoRestaurante, nombreRestaurante }) => {
  // --- ESTADOS ---
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [carrito, setCarrito] = useState([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [avisoAgregado, setAvisoAgregado] = useState(null);

  // Formulario Pedido
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [tipoPedido, setTipoPedido] = useState("mesa");
  const [enviando, setEnviando] = useState(false);
  // Modificaciones para el Menú del Día Inteligente
  const [entradaSeleccionada, setEntradaSeleccionada] = useState(null);
  const [segundoSeleccionado, setSegundoSeleccionado] = useState(null);
  const [bebidaSeleccionada, setBebidaSeleccionada] = useState(null);
  // 🌟 ESTADOS PARA CONECTAR EL CONTROL GLOBAL
  const [menuDiaPrecio, setMenuDiaPrecio] = useState(15);
  const [menuDiaActivo, setMenuDiaActivo] = useState(true);

  // Seguimiento Realtime
  const [pedidoActivoId, setPedidoActivoId] = useState(
    localStorage.getItem(`ultimoPedido_${restauranteId}`),
  );
  const [datosPedidoRealtime, setDatosPedidoRealtime] = useState(null);
  const [tiempoRestante, setTiempoRestante] = useState(600);
  // Reseñas
  const [mostrarModalCalificacion, setMostrarModalCalificacion] =
    useState(false);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState("");
  //  CALCULO AUTOMÁTICO DEL TOTAL EN TIEMPO REAL
  const total = useMemo(() => {
    return carrito.reduce(
      (acc, item) => acc + Number(item.precio || 0) * item.cantidad,
      0,
    );
  }, [carrito]);

  // --- EFECTOS ---

  // 1. Cargar Configuración y Productos
  useEffect(() => {
    if (!restauranteId || restauranteId === "undefined") return;

    if (productos.length === 0) setCargando(true);
    const configRef = doc(
      db,
      "restaurantes",
      restauranteId,
      "configuraciones",
      "menu_dia",
    );
    const unsubConfig = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.precio !== undefined) setMenuDiaPrecio(Number(data.precio));
        if (data.activo !== undefined) setMenuDiaActivo(data.activo);
      }
    });
    const productosRef = collection(
      db,
      "restaurantes",
      restauranteId,
      "productos",
    );

    const q = query(productosRef, where("disponible", "==", true));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProductos(data);
        setCargando(false);
      },
      (error) => {
        console.error("Error en Firebase Menu:", error);
        setCargando(false);
      },
    );

    return () => {
      unsubConfig();
      unsub();
    };
  }, [restauranteId]);
  //Seguimeto para el contador regresivo
  useEffect(() => {
    let intervalo;

    if (datosPedidoRealtime?.estado === "cocinando" && tiempoRestante > 0) {
      intervalo = setInterval(() => {
        setTiempoRestante((prev) => prev - 1);
      }, 1000);
    } else if (datosPedidoRealtime?.estado === "entregado") {
      setTiempoRestante(0);
      clearInterval(intervalo);
    }

    return () => clearInterval(intervalo);
  }, [datosPedidoRealtime?.estado, tiempoRestante]);

  // Función para mostrar el tiempo
  const formatearTiempo = (segundos) => {
    if (segundos <= 0) return "¡Listo!";
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m}:${s < 10 ? "0" : ""}${s} min aprox.`;
  };

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

  // Cargar el pedido activo en el carrito local al montar el componente
  useEffect(() => {
    const cargarPedidoActivo = async () => {
      if (!pedidoActivoId || !restauranteId) return;
      try {
        const pedidoRef = doc(
          db,
          "restaurantes",
          restauranteId,
          "pedidos",
          pedidoActivoId,
        );
        const docSnap = await getDoc(pedidoRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.items && data.items.length > 0) {
            const itemsCarrito = data.items.map((item) => ({
              id: item.id,
              idUnico: item.idUnico,
              nombre: item.nombre,
              precio: item.precio,
              cantidad: item.cantidad,
              detalles: item.detalles,
              isMenuCompleto: !!item.detalles,
            }));
            setCarrito(itemsCarrito);
          }
        }
      } catch (error) {
        console.error("Error cargando pedido activo:", error);
      }
    };
    cargarPedidoActivo();
  }, [pedidoActivoId, restauranteId]);
  // 3. Temporizador Aviso
  useEffect(() => {
    if (avisoAgregado) {
      const timer = setTimeout(() => setAvisoAgregado(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [avisoAgregado]);

  // funcion calculo
  const totalCalculado = useMemo(() => {
    return carrito.reduce(
      (acc, item) => acc + (Number(item.precio) || 0) * (item.cantidad || 1),
      0,
    );
  }, [carrito]);
  // Funcion para mostrar productos (Actualizada para el Menú del Día)
  const productosParaMostrar = useMemo(() => {
    // Si no estamos en la categoría del menú, se comporta exactamente igual que antes
    if (categoriaActual !== "Menú del Día") {
      return productos.filter(
        (p) => p.categoria === categoriaActual && p.disponible !== false,
      );
    }

    // 🌟 SI ES MENÚ DEL DÍA: Mostramos los platos del restaurante según lo que falte seleccionar
    return productos.filter((p) => {
      if (p.disponible === false) return false;

      // Evitamos mostrar el propio producto contenedor base del menú en la lista de abajo
      if (p.categoria === "Menú del Día") return false;

      // 1. Si falta el Segundo, mostramos solo los platos de la categoría "Comidas"
      if (!segundoSeleccionado) {
        return p.categoria === "Comidas";
      }

      // 2. Si ya eligió Segundo pero falta Entrada, mostramos solo la categoría "Entradas"
      if (!entradaSeleccionada) {
        return p.categoria === "Entradas";
      }

      // 3. Si ya eligió Segundo y Entrada pero falta Bebida, mostramos solo la categoría "Bebidas"
      if (!bebidaSeleccionada) {
        return p.categoria === "Bebidas";
      }

      return false;
    });
  }, [
    productos,
    categoriaActual,
    segundoSeleccionado,
    entradaSeleccionada,
    bebidaSeleccionada,
  ]);

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
      const detalleKey = producto.isMenuCompleto
        ? JSON.stringify(producto.detalles)
        : "estandar";

      const idUnico = `${producto.id}_${detalleKey}`;

      const existe = prev.find((item) => item.idUnico === idUnico);

      if (existe) {
        return prev.map((item) =>
          item.idUnico === idUnico
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        );
      }

      return [...prev, { ...producto, idUnico, cantidad: 1 }];
    });
  };
  // Funcion restar al carrito
  const restarAlCarrito = (idUnico) => {
    if (datosPedidoRealtime?.estado === "cocinando") return;
    setCarrito((prev) =>
      prev.map((item) =>
        item.idUnico === idUnico && item.cantidad > 1
          ? { ...item, cantidad: item.cantidad - 1 }
          : item,
      ),
    );
    // al llegar a 1 se elimine, descomenta:
    setCarrito((prev) =>
      prev.filter((item) => !(item.idUnico === idUnico && item.cantidad === 1)),
    );
  };

  // Funcion enviar pedido
  const enviarPedidoFinal = async (datosCliente = null) => {
    if (carrito.length === 0 || enviando) return;

    try {
      setEnviando(true);

      // 1. Identificar si ya existe un pedido activo
      const idExistente =
        pedidoActivoId || localStorage.getItem(`ultimoPedido_${restauranteId}`);
      let datosPedidoRealtime = null;

      // 2. Obtener datos frescos si hay un pedido previo
      if (idExistente) {
        const docRef = doc(
          db,
          "restaurantes",
          restauranteId,
          "pedidos",
          idExistente,
        );
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          datosPedidoRealtime = docSnap.data();
        }
      }

      // 3. Mapear productos del carrito actual
      const nuevosItems = carrito.map((item) => {
        let precioTotalItem = Number(item.precio);

        if (item.isMenuCompleto && item.detalles?.precioExtra) {
          precioTotalItem += Number(item.detalles.precioExtra);
        }

        return {
          id: item.id,
          idUnico: item.idUnico,
          nombre: item.nombre,
          precio: precioTotalItem,
          cantidad: item.cantidad,
          subtotal: precioTotalItem * item.cantidad,
          detalles: item.detalles || null,
        };
      });

      // 4. Lógica de fusión o creación
      let pedidoParaFirebase;
      let itemsFusionados = []; // para luego actualizar el carrito local

      if (idExistente && datosPedidoRealtime) {
        // ---- ACTUALIZACIÓN CON FUSIÓN (NO REEMPLAZO) ----
        const itemsExistentes = datosPedidoRealtime.items || [];
        const itemsMap = new Map();
        itemsExistentes.forEach((item) => {
          itemsMap.set(item.idUnico, { ...item });
        });

        nuevosItems.forEach((nuevoItem) => {
          if (itemsMap.has(nuevoItem.idUnico)) {
            const existente = itemsMap.get(nuevoItem.idUnico);
            existente.cantidad += nuevoItem.cantidad;
            existente.subtotal = existente.precio * existente.cantidad;
            itemsMap.set(nuevoItem.idUnico, existente);
          } else {
            itemsMap.set(nuevoItem.idUnico, { ...nuevoItem });
          }
        });

        itemsFusionados = Array.from(itemsMap.values());

        pedidoParaFirebase = {
          ...datosPedidoRealtime,
          items: itemsFusionados,
          total: itemsFusionados.reduce(
            (acc, curr) => acc + (curr.subtotal || 0),
            0,
          ),
          fechaActualizacion: new Date(),
        };
      } else {
        // ---- PEDIDO NUEVO ----
        pedidoParaFirebase = {
          cliente: {
            nombre: datosCliente?.nombre || "Cliente",
            tipo: tipoPedido === "mesa" ? "Mesa" : "Delivery",
            referencia: datosCliente?.referencia || "",
            telefono: datosCliente?.telefono || "No provisto",
          },
          items: nuevosItems,
          total: nuevosItems.reduce((acc, curr) => acc + curr.subtotal, 0),
          estado: "pendiente",
          fecha: new Date(),
          restauranteId: restauranteId,
        };
        itemsFusionados = nuevosItems; // para pedido nuevo también
      }

      // 5. Enviar a Firebase
      const idNuevo = await gestionarPedido(
        restauranteId,
        pedidoParaFirebase,
        idExistente,
      );

      // 6. Sincronizar carrito local con los items fusionados (para que no se pierda nada)
      // Convertir itemsFusionados al formato del carrito (agregar propiedades que falten)
      const carritoSincronizado = itemsFusionados.map((item) => ({
        id: item.id,
        idUnico: item.idUnico,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad,
        detalles: item.detalles,
        isMenuCompleto: !!item.detalles, // opcional, según tu lógica
      }));
      setCarrito(carritoSincronizado);

      await Swal.fire({
        title: "¡Éxito!",
        text: idExistente
          ? "Tu pedido ha sido actualizado."
          : "Orden enviada con éxito.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });

      // 7. Limpiar modales (pero NO vaciar carrito si es actualización)
      setVerCarrito(false);
      setMostrarFormulario(false);
      setCategoriaActual(null);

      if (!idExistente && idNuevo) {
        setPedidoActivoId(idNuevo);
        localStorage.setItem(`ultimoPedido_${restauranteId}`, idNuevo);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error al enviar pedido:", error);
      Swal.fire("Aviso", "Ocurrió un error al procesar tu pedido.", "warning");
    } finally {
      setEnviando(false);
    }
  };
  //funcion borra dell carrito
  const eliminarDelCarrito = (idUnico) => {
    if (datosPedidoRealtime?.estado === "cocinando") return;
    const itemEliminado = carrito.find((item) => item.idUnico === idUnico);
    setCarrito((prev) => prev.filter((item) => item.idUnico !== idUnico));
    setAvisoAgregado(null);
    setTimeout(() => {
      setAvisoAgregado(`- ${itemEliminado?.nombre} quitado`);
    }, 10);
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
    <div className="inicio-container">
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
      {/* SESION DE SEGUIMIENTO PEDIDO */}
      {pedidoActivoId && datosPedidoRealtime && (
        <div className="view-principal">
          <div className="seguimiento-box tarjeta-def-oscura">
            <div className="seguimiento-header">
              <h3 className="titulo-categoria">Sigue tu Orden 🥣</h3>
              <div className="seguimiento-header-total">
                <span className="pedido-id-tag">
                  🧍{" "}
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
                  <ShoppingBag size={16} />
                </div>
                <span className="step-label">Recibido</span>
              </div>

              {/* Paso 2: Cocina + CONTADOR */}
              <div
                className={`step ${getEtapa(datosPedidoRealtime.estado) >= 2 ? "active" : ""} ${getEtapa(datosPedidoRealtime.estado) > 2 ? "completed" : ""}`}
              >
                <div
                  className={`step-circle ${datosPedidoRealtime.estado === "cocinando" ? "pulse-animation" : ""}`}
                >
                  <Utensils size={14} />
                </div>
                <span className="step-label">Cocina</span>

                {/* Contador Dinámico */}
                {datosPedidoRealtime.estado === "cocinando" && (
                  <div className="contador-espera pulse-animation">
                    ⏱️ {formatearTiempo(tiempoRestante)}
                  </div>
                )}

                {datosPedidoRealtime.estado === "pendiente" && (
                  <div
                    className="contador-espera"
                    style={{ background: "#64748b" }}
                  >
                    En espera...
                  </div>
                )}
              </div>

              {/* Paso 3: Entregado */}
              <div
                className={`step ${getEtapa(datosPedidoRealtime.estado) >= 3 ? "active" : ""}`}
              >
                <div className="step-circle">
                  <CheckCircle size={16} />
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
      {/* SESION CATEGORÍAS principal */}
      {!categoriaActual && (
        <div className="view-principal">
          <header className="menu-header-dinamico">
            <h1>
              {nombreRestaurante ||
                restauranteId?.replace(/_/g, " ").toUpperCase() ||
                "NUESTRO MENÚ"}
            </h1>
          </header>

          <img
            src={
              logoRestaurante
                ? `/${logoRestaurante.trim()}`
                : "/logo_resturante.gif"
            }
            alt="logo restaurante"
            className="logo-circular"
            onError={(e) => {
              console.log(
                "Error cargando logo específico. Intentando cargar:",
                logoRestaurante,
              );
              if (
                e.target.src !==
                window.location.origin + "/logo_resturante.gif"
              ) {
                e.target.src = "/logo_resturante.gif";
              }
            }}
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
            {menuDiaActivo && (
              <div
                className="cat-item"
                onClick={() => setCategoriaActual("Menú del Día")}
              >
                <UtensilsCrossed size={60} className="icon-menudia" />
                <p>Menú del Día</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SESION DE PRODUCTOS */}
      {categoriaActual && (
        <div className="admin-container">
          <div className="header-categoria">
            <button
              className="btn-volver-minimal"
              onClick={() => {
                setCategoriaActual(null);
                setEntradaSeleccionada(null);
                setSegundoSeleccionado(null);
                setBebidaSeleccionada(null);
              }}
            >
              <ArrowLeft size={18} /> Volver
            </button>
            <h2 className="titulo-categoria">{categoriaActual}</h2>
            <div className="header-categoria-spacer"></div>
          </div>

          {categoriaActual === "Menú del Día" && (
            <div className="seccion-armar-menu">
              {/* 🌟 Instrucción integrada */}
              <p className="descripcion-corta-titulo">
                Arma tu menú: Selecciona 1 Segundo + 1 Entrada + 1 Bebida. (Si
                prefieres no elegir bebida, incluye refresco del dia gratis).
              </p>

              <div className="cabecera-armar-menu">
                <h4>📋 Tu Menú Actual Por:s/</h4>
                <span className="badge-precio-menu">S/ {menuDiaPrecio}</span>
              </div>

              <ul className="lista-resumen-menu">
                <li>
                  <strong>• Entrada:</strong>{" "}
                  {entradaSeleccionada ? (
                    entradaSeleccionada.nombre
                  ) : (
                    <span className="texto-vacio">
                      No seleccionada (Ninguna)
                    </span>
                  )}
                </li>
                <li>
                  <strong>• Segundo:</strong>{" "}
                  {segundoSeleccionado ? (
                    segundoSeleccionado.nombre
                  ) : (
                    <span className="texto-requerido">Requerido *</span>
                  )}
                </li>
                <li>
                  <strong>• Bebida:</strong>{" "}
                  {bebidaSeleccionada ? (
                    bebidaSeleccionada.nombre
                  ) : (
                    <span className="texto-cortesia">
                      Agua de cortesía (Gratis)
                    </span>
                  )}
                </li>
              </ul>

              <button
                className="btn-agregar"
                disabled={!segundoSeleccionado}
                onClick={() => {
                  const itemMenu = {
                    id: `menu_${Date.now()}`,
                    nombre: `Menú del Día (${segundoSeleccionado.nombre})`,
                    precio: menuDiaPrecio,
                    cantidad: 1,
                    isMenuCompleto: true,
                    detalles: {
                      entrada: entradaSeleccionada
                        ? entradaSeleccionada.nombre
                        : "Ninguna",
                      segundo: segundoSeleccionado.nombre,
                      bebida: bebidaSeleccionada
                        ? bebidaSeleccionada.nombre
                        : "Agua de cortesía",
                    },
                  };

                  agregarAlCarrito(itemMenu);

                  setEntradaSeleccionada(null);
                  setSegundoSeleccionado(null);
                  setBebidaSeleccionada(null);
                }}
              >
                {segundoSeleccionado
                  ? "➕ Agregar Menú al Carrito"
                  : "⚠️ Selecciona un Segundo para añadir"}
              </button>
            </div>
          )}

          {/* 🌟 CAMBIO 2: Evaluamos la grilla por separado para que el aviso no rompa el panel de arriba */}
          {productosParaMostrar.length === 0 ? (
            categoriaActual !== "Menú del Día" && (
              <div className="no-data">
                <p>No hay productos disponibles en esta categoría por ahora.</p>
              </div>
            )
          ) : (
            <div className="productos-grid-dos-columnas">
              {productosParaMostrar.map((p) => {
                const esEntradaActiva = entradaSeleccionada?.id === p.id;
                const esSegundoActivo = segundoSeleccionado?.id === p.id;
                const esBebidaActiva = bebidaSeleccionada?.id === p.id;
                const estaSeleccionadoEnMenu =
                  esEntradaActiva || esSegundoActivo || esBebidaActiva;

                return (
                  <div
                    key={p.id}
                    className={`producto-card ${estaSeleccionadoEnMenu ? "card-seleccionada-pro" : ""}`}
                  >
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

                      {/* 🌟 CAMBIO 3: Ocultamos el precio individual de la carta si estamos armando el Menú del Día */}
                      {categoriaActual !== "Menú del Día" && (
                        <p className="precio">
                          S/ {Number(p.precio || 0).toFixed(2)}
                        </p>
                      )}

                      {categoriaActual === "Menú del Día" ? (
                        <div className="contenedor-botones-pasos">
                          {p.categoria?.toLowerCase() === "entradas" && (
                            <button
                              className="btn-agregar"
                              onClick={() =>
                                setEntradaSeleccionada(
                                  esEntradaActiva ? null : p,
                                )
                              }
                            >
                              {esEntradaActiva ? "✓ Entrada Ok" : "+ Entrada"}
                            </button>
                          )}
                          {(p.categoria?.toLowerCase() === "comidas" ||
                            !p.categoria) && (
                            <button
                              className="btn-agregar"
                              onClick={() =>
                                setSegundoSeleccionado(
                                  esSegundoActivo ? null : p,
                                )
                              }
                            >
                              {esSegundoActivo ? "✓ Segundo Ok" : "+ Segundo"}
                            </button>
                          )}
                          {p.categoria?.toLowerCase() === "bebidas" && (
                            <button
                              className="btn-agregar"
                              onClick={() =>
                                setBebidaSeleccionada(esBebidaActiva ? null : p)
                              }
                            >
                              {esBebidaActiva ? "✓ Bebida Ok" : "+ Bebida"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          className={`btn-agregar ${!p.disponible ? "agotado" : ""}`}
                          onClick={() => agregarAlCarrito(p)}
                          disabled={!p.disponible}
                        >
                          {!p.disponible ? (
                            <span>Agotado</span>
                          ) : (
                            <>
                              <Plus size={18} />
                              <span>Agregar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                  <div key={item.idUnico} className="carrito-item">
                    <div className="item-info">
                      <h4>{item.nombre}</h4>
                      <span>S/ {Number(item.precio).toFixed(2)}</span>
                    </div>

                    <div className="item-controles">
                      <button onClick={() => restarAlCarrito(item.idUnico)}>
                        -
                      </button>
                      <span className="item-cantidad">{item.cantidad}</span>
                      <button onClick={() => agregarAlCarrito(item)}>+</button>
                      <button
                        className="btn-eliminar-item"
                        onClick={() => eliminarDelCarrito(item.idUnico)}
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
