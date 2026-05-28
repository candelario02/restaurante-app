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
  Cake,
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
  const [mostrarConfirmarEliminar, setMostrarConfirmarEliminar] =
    useState(false);
  const [mostrarExitoEliminar, setMostrarExitoEliminar] = useState(false);
  //apagar carrioto
  const [mostrarIconoCarrito, setMostrarIconoCarrito] = useState(false);

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

  2; //Seguimeto para el contador regresivo
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

  // Efecto para sincronizar el carrito cuando el estado cambia de estado fuera de "pendiente"
  useEffect(() => {
    if (datosPedidoRealtime && datosPedidoRealtime.estado !== "pendiente") {
      if (datosPedidoRealtime.items) {
        const itemsSincronizados = datosPedidoRealtime.items.map((item) => ({
          id: item.id,
          idUnico: item.idUnico,
          nombre: item.nombre,
          descripcion: item.descripcion || "",
          precio: Number(item.precio),
          precioBase: Number(
            item.detalles?.precioExtra
              ? item.precio - item.detalles.precioExtra
              : item.precio,
          ),
          cantidad: item.cantidad,
          detalles: item.details || item.detalles,
          isMenuCompleto: !!item.detalles,
        }));

        setCarrito(itemsSincronizados);
      }
    }
  }, [datosPedidoRealtime?.estado]);

  // 3. SEGUIMIENTO REALTIME Y SINCRONIZACIÓN AUTOMÁTICA DEL CARRITO
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
          if (data.items && data.items.length > 0 && carrito.length === 0) {
            const itemsCarrito = data.items.map((item) => ({
              id: item.id,
              idUnico: item.idUnico,
              nombre: item.nombre,
              descripcion: item.descripcion || "",
              precio: Number(item.precio),
              precioBase: Number(
                item.detalles?.precioExtra
                  ? item.precio - item.detalles.precioExtra
                  : item.precio,
              ),
              cantidad: item.cantidad,
              detalles: item.details || item.detalles,
              isMenuCompleto: !!item.detalles,
            }));
            setCarrito(itemsCarrito);
          }

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
  }, [pedidoActivoId, restauranteId, carrito.length]);

  // 4. Temporizador Aviso
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
        return p.categoria === "Bebidas" || p.categoria === "Cafeteria";
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
    if (
      datosPedidoRealtime?.estado === "entregado" ||
      datosPedidoRealtime?.estado === "cancelado"
    ) {
      Swal.fire({
        title: "Pedido finalizado",
        text: "Este pedido ya fue cerrado y no se le pueden añadir más productos.",
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
      const detalleKey =
        producto.isMenuCompleto && producto.detalles
          ? `${producto.detalles.entradaId || "s"}_${producto.detalles.segundoId || "s"}_${producto.detalles.bebidaId || "s"}`
          : "estandar";

      const idUnico = `${producto.id}_${detalleKey}`;
      const existe = prev.find((item) => item.idUnico === idUnico);

      if (existe) {
        return prev.map((item) =>
          item.idUnico === idUnico
            ? { ...item, cantidad: item.cantidad + 1 } // Conserva su notaCliente intacta
            : item,
        );
      }

      const precioBase = Number(producto.precioBase || producto.precio || 0);

      // Si el producto viene directamente del pedido original de Firebase, conservamos su nota original
      const notaOriginal = producto.notaCliente || "";

      return [
        ...prev,
        {
          ...producto,
          idUnico,
          precioBase,
          cantidad: 1,
          notaCliente: notaOriginal,
        },
      ];
    });
  };

  // Funcion restar al carrito
  const restarAlCarrito = (idUnico) => {
    // 🌟 CORREGIDO: Si está en cocina, revisamos si el plato pertenece a la orden vieja de Firebase
    const esDeCocina =
      datosPedidoRealtime?.estado === "cocinando" &&
      datosPedidoRealtime.items?.some((oldItem) => oldItem.idUnico === idUnico);

    if (esDeCocina) return; // ⛔ Bloqueado si ya está cocinándose

    setCarrito((prev) => {
      const itemExistente = prev.find((item) => item.idUnico === idUnico);

      if (!itemExistente) return prev;

      if (itemExistente.cantidad === 1) {
        return prev.filter((item) => item.idUnico !== idUnico);
      }

      return prev.map((item) =>
        item.idUnico === idUnico
          ? { ...item, cantidad: item.cantidad - 1 }
          : item,
      );
    });
  };

  // Funcion enviar pedido final
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

      // 3. Mapear productos del carrito actual calculando precios dinámicos
      const nuevosItems = carrito.map((item) => {
        const precioBase = Number(item.precioBase || item.precio || 0);
        let precioExtra = 0;

        if (item.isMenuCompleto && item.detalles) {
          const extraEntrada = Number(item.detalles.entradaPrecioExtra || 0);
          const extraBebida = Number(item.detalles.bebidaPrecioExtra || 0);
          const extraGeneral = Number(item.detalles.precioExtra || 0);

          precioExtra = extraEntrada + extraBebida + extraGeneral;
        }

        const precioFinalItem = precioBase + precioExtra;

        return {
          id: item.id,
          idUnico: item.idUnico,
          nombre: item.nombre,
          descripcion: item.descripcion || "",
          precio: precioFinalItem,
          cantidad: item.cantidad,
          subtotal: precioFinalItem * item.cantidad,
          detalles: item.detalles || null,
          notaCliente: item.notaCliente || "", // ✏️ Req 4.1: Conservamos las notas/preferencias por plato
        };
      });

      // ==========================================================================
      // 🌟 PASO 4: FUSIÓN INTELIGENTE Y CÁLCULO DE ADICIONALES (ANTI-REEMPLAZO)
      // ==========================================================================
      let itemsFinales = [];

      if (idExistente && datosPedidoRealtime) {
        // Filtramos y quitamos empaques y cortesías viejas para recalcularlos limpiamente
        const itemsPreviosLimpios = (datosPedidoRealtime.items || []).filter(
          (i) => i.id !== "insumo_taper_envase" && i.id !== "postre_cortesia",
        );

        itemsFinales = [...itemsPreviosLimpios];

        // Recorremos los ítems que el cliente tiene en su carrito local actual
        nuevosItems.forEach((nuevo) => {
          if (
            nuevo.id === "insumo_taper_envase" ||
            nuevo.id === "postre_cortesia"
          )
            return;

          const index = itemsFinales.findIndex(
            (f) => f.idUnico === nuevo.idUnico,
          );

          if (index !== -1) {
            const itemOriginal = itemsPreviosLimpios.find(
              (f) => f.idUnico === nuevo.idUnico,
            );

            itemsFinales[index].cantidad = nuevo.cantidad;
            itemsFinales[index].subtotal = nuevo.subtotal;

            // 🌟 CORREGIDO: Si el input está vacío pero ya existía una nota inicial, la preservamos
            itemsFinales[index].notaCliente =
              nuevo.notaCliente.trim() !== ""
                ? nuevo.notaCliente
                : itemOriginal?.notaCliente || "";

            const cantidadOriginal = itemOriginal?.cantidad || 0;
            if (nuevo.cantidad > cantidadOriginal) {
              itemsFinales[index].adicionado = true;
            }
          } else {
            // Si es un antojo completamente nuevo
            itemsFinales.push({ ...nuevo, adicionado: true });
          }
        });
      } else {
        // 🍔 MODO NUEVO: El pedido arranca directamente con los platos del carrito local
        itemsFinales = [...nuevosItems].filter(
          (i) => i.id !== "insumo_taper_envase" && i.id !== "postre_cortesia",
        );
      }

      // 🥡 Req 4.2: LÓGICA DEL TÁPER (+ S/. 1.00 PARA LLEVAR / DELIVERY)
      const requiereTaper =
        tipoPedido === "delivery" || tipoPedido === "llevar";

      if (requiereTaper) {
        // 🌟 CORREGIDO: Sumamos las cantidades reales de todos los platos de comida para saber cuántos tápers se necesitan
        const totalEmpaquesNecesarios = itemsFinales.reduce(
          (acc, item) => acc + item.cantidad,
          0,
        );

        if (totalEmpaquesNecesarios > 0) {
          itemsFinales.push({
            id: "insumo_taper_envase",
            idUnico: "insumo_taper_envase_unico",
            nombre: "Cargo por Empaque / Llevar",
            descripcion: "Costo de envases descartables",
            precio: 1.0,
            cantidad: totalEmpaquesNecesarios, // Cantidad exacta emparejada
            subtotal: 1.0 * totalEmpaquesNecesarios,
            detalles: null,
          });
        }
      }

      // 🧁 Req 6: LÓGICA DE POSTRE DE CORTESÍA (PRECIO 0.00 SI SUPERA LOS S/. 50.00)
      // Calculamos el subtotal acumulado excluyendo cargos de empaque o cortesías previas
      const subtotalParaCortesia = itemsFinales
        .filter(
          (i) => i.id !== "insumo_taper_envase" && i.id !== "postre_cortesia",
        )
        .reduce((acc, curr) => acc + curr.subtotal, 0);

      const yaTieneCortesia = itemsFinales.some(
        (i) => i.id === "postre_cortesia",
      );

      if (subtotalParaCortesia >= 50.0 && !yaTieneCortesia) {
        itemsFinales.push({
          id: "postre_cortesia",
          idUnico: "postre_cortesia_unico",
          nombre: "Postre de Cortesía (Regalo S/ 0.00)",
          descripcion: "Obsequio automático por superar monto mínimo",
          precio: 0.0,
          cantidad: 1,
          subtotal: 0.0,
          detalles: null,
        });
      }

      // Calculamos el gran total consolidado definitivo para la base de datos y la caja
      const totalConsolidado = itemsFinales.reduce(
        (acc, curr) => acc + curr.subtotal,
        0,
      );

      // Ensamblamos el payload final respetando las dos realidades de Firebase
      let pedidoParaFirebase;

      if (idExistente && datosPedidoRealtime) {
        pedidoParaFirebase = {
          ...datosPedidoRealtime,
          items: itemsFinales,
          total: totalConsolidado, // 🌟 CORREGIDO: Cambiado totalConsolidated por totalConsolidado
          fechaActualizacion: new Date(),
        };
      } else {
        pedidoParaFirebase = {
          cliente: {
            nombre: datosCliente?.nombre || "Cliente",
            tipo: tipoPedido === "mesa" ? "Mesa" : "Delivery",
            referencia: datosCliente?.referencia || "",
            telefono: datosCliente?.telefono || "No provisto",
          },
          items: itemsFinales,
          total: totalConsolidado,
          estado: "pendiente",
          fecha: new Date(),
          restauranteId: restauranteId,
        };
      }

      // 5. Enviar a Firebase usando tu servicio único
      const idNuevo = await gestionarPedido(
        restauranteId,
        pedidoParaFirebase,
        idExistente,
      );

      // ==========================================================================
      // 🌟 CAMBIO AQUÍ: Vaciar el carrito por completo tras el envío exitoso
      // ==========================================================================
      setCarrito([]); // 🛒 Limpia la interfaz local de React inmediatamente

      // ==========================================================================
      // 🌟 AGREGADO: GESTIÓN DE ALERTAS DINÁMICAS (DELIVERY MULTIPUNTO vs MESA)
      // ==========================================================================
      const esDelivery = pedidoParaFirebase.cliente.tipo === "Delivery";

      if (esDelivery) {
        const configData = await obtenerConfigRestaurante(restauranteId);
        const numeroWhatsApp = configData?.whatsapp;

        if (!numeroWhatsApp) {
          await Swal.fire({
            title: "Aviso del Restaurante",
            text: "Este local no tiene un número de WhatsApp configurado para coordinar el despacho. Tu pedido ya está guardado en la cocina de la web.",
            icon: "warning",
            confirmButtonText: "Entendido",
            confirmButtonColor: "#6b7280",
          });

          setVerCarrito(false);
          setMostrarFormulario(false);
          setCategoriaActual(null);
          setCarrito([]);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        const totalFinal = pedidoParaFirebase.total;
        const infoCliente = pedidoParaFirebase.cliente;

        // Estructura limpia de ítems que ahora jala de "itemsFinales" garantizando cuadre con WhatsApp
        const listaPlatosTexto = itemsFinales
          .map(
            (item) =>
              `• ${item.cantidad}x ${item.nombre} ${item.notaCliente ? `[Nota: ${item.notaCliente}]` : ""} (S/ ${item.precio.toFixed(2)})`,
          )
          .join("\n");

        const encabezadoTexto = idExistente
          ? `🔄 *¡PEDIDO ACTUALIZADO EN LA WEB!* 🔄`
          : `🍔 *¡NUEVO PEDIDO DESDE LA WEB!* 🍔`;

        const textoWhatsApp = encodeURIComponent(
          `${encabezadoTexto}\n\n` +
            `*Cliente:* ${infoCliente.nombre}\n` +
            `*Teléfono:* ${infoCliente.telefono}\n` +
            `*Tipo:* ${infoCliente.tipo}\n` +
            `${infoCliente.referencia ? `*Dirección/Ref:* ${infoCliente.referencia}\n` : ""}\n` +
            `*Detalle del Pedido:*\n${listaPlatosTexto}\n\n` +
            `*Total a Pagar:* S/ ${totalFinal.toFixed(2)}\n\n` +
            `_Enviado de forma automática desde el sistema._`,
        );

        const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${textoWhatsApp}`;

        await Swal.fire({
          title: idExistente ? "¡Pedido Actualizado!" : "¡Pedido Registrado!",
          text: "Los datos ya están guardados en cocina. ¿Deseas enviar el resumen detallado a nuestro WhatsApp para coordinar el motorizado?",
          icon: "success",
          showCancelButton: true,
          confirmButtonColor: "#10b981",
          cancelButtonColor: "#6b7280",
          confirmButtonText: "Enviar a WhatsApp",
          cancelButtonText: "Omitir, ver en web",
        }).then((result) => {
          if (result.isConfirmed) {
            window.open(linkWhatsApp, "_blank");
          }
        });
      } else {
        await Swal.fire({
          title: "¡Éxito!",
          text: idExistente
            ? "Tu pedido ha sido actualizado correctamente."
            : "Orden enviada con éxito.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }

      // 7. Limpiar estados de control de interfaz y guardar ID (Tu lógica original intacta)
      setVerCarrito(false);
      setMostrarFormulario(false);
      setCategoriaActual(null);

      if (!idExistente && idNuevo) {
        setPedidoActivoId(idNuevo);
        localStorage.setItem(`ultimoPedido_${restauranteId}`, idNuevo);
      }

      setCarrito([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error al enviar pedido:", error);
      Swal.fire("Aviso", "Ocurrió un error al procesar tu pedido.", "warning");
    } finally {
      setEnviando(false);
    }
  };
  // Funcion borrar del carrito
  const eliminarDelCarrito = (idUnico) => {
    // 🌟 CORREGIDO: Si está en cocina, validamos individualmente que no sea un plato viejo congelado
    const esDeCocina =
      datosPedidoRealtime?.estado === "cocinando" &&
      datosPedidoRealtime.items?.some((oldItem) => oldItem.idUnico === idUnico);

    if (esDeCocina) return; // ⛔ Bloqueado si ya está en producción

    const itemEliminado = carrito.find((item) => item.idUnico === idUnico);
    setCarrito((prev) => prev.filter((item) => item.idUnico !== idUnico));
    setAvisoAgregado(null);
    setTimeout(() => {
      setAvisoAgregado(`- ${itemEliminado?.nombre} quitado`);
    }, 10);
  };
  // funciond e eleiminar todo el pedido mientras esta pendiente
  const eliminarPedidoCompleto = async (confirmadoDesdeModal = false) => {
    if (!pedidoActivoId || !restauranteId) return;

    if (
      datosPedidoRealtime?.estado === "cocinando" ||
      datosPedidoRealtime?.estado === "entregado"
    ) {
      // Nota: Si tienes un modal de error general puedes usarlo aquí, por ahora manejamos el flujo principal
      return;
    }

    if (!confirmadoDesdeModal) {
      setMostrarConfirmarEliminar(true);
      return;
    }

    try {
      const pedidoRef = doc(
        db,
        "restaurantes",
        restauranteId,
        "pedidos",
        pedidoActivoId,
      );

      await updateDoc(pedidoRef, {
        estado: "cancelado",
        canceladoPor: "cliente",
        fechaCancelacion: new Date(),
      });

      // Limpieza total del carrito e interfaz
      setCarrito([]);
      setPedidoActivoId(null);
      setDatosPedidoRealtime(null);

      setVerCarrito(false);
      setMostrarConfirmarEliminar(false);

      localStorage.removeItem(`ultimoPedido_${restauranteId}`);

      // 🌟 ACTIVAMOS EL MODAL DE ÉXITO ESTÉTICO
      setMostrarExitoEliminar(true);
    } catch (error) {
      console.error("Error al eliminar el pedido completo:", error);
    }
  };
  // Función para revertir cambios locales y recuperar lo que está en Firebase
  const revertirCambiosPedido = async () => {
    if (!pedidoActivoId || !restauranteId) {
      setVerCarrito(false);
      return;
    }

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
          // Estructuramos los ítems tal como están en la base de datos
          const itemsOriginales = data.items.map((item) => ({
            id: item.id,
            idUnico: item.idUnico,
            nombre: item.nombre,
            precio: Number(item.precio),
            cantidad: item.cantidad,
            detalles: item.detalles,
            isMenuCompleto: !!item.detalles,
            notaCliente: item.notaCliente || "", // 🌟 CORREGIDO: Recupera la nota de Firebase al revertir
          }));

          // Restauramos el carrito al estado real de la cocina
          setCarrito(itemsOriginales);
        } else {
          setCarrito([]);
        }
      }
      // Cerramos el modal una vez restaurado
      setVerCarrito(false);
    } catch (error) {
      console.error("Error al revertir cambios del pedido:", error);
      setVerCarrito(false);
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
      {carrito.length > 0 && !mostrarFormulario && mostrarIconoCarrito && (
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
                  disabled={
                    datosPedidoRealtime?.estado === "entregado" ||
                    datosPedidoRealtime?.estado === "cancelado"
                  }
                  onClick={async () => {
                    // ✏️ MODIFICACIÓN: Si está en cocina, le avisa pero le permite continuar en vez de rebotarlo con un return
                    if (datosPedidoRealtime?.estado !== "pendiente") {
                      await Swal.fire({
                        title: "Aviso Importante",
                        text: "Tu pedido ya está en cocina y esos platos ya no se pueden modificar, pero ¡sí puedes agregar productos adicionales a tu orden!",
                        icon: "info",
                        confirmButtonText: "Entendido, agregar más",
                        confirmButtonColor: "#4CAF50",
                      });
                    } else {
                      // Si el pedido sigue pendiente, muestra tu confirmación normal de siempre
                      const { isConfirmed } = await Swal.fire({
                        title: "¡Perfecto!",
                        text: "Tu carrito se cargará con tu pedido actual para que puedas añadir algo más o modificarlo.",
                        icon: "info",
                        confirmButtonText: "Entendido",
                        confirmButtonColor: "#4CAF50",
                      });

                      if (!isConfirmed) return;
                    }

                    // Carga los ítems actuales al carrito local (Funciona para ambos estados)
                    setCarrito([...datosPedidoRealtime.items]);

                    setVerCarrito(false);
                    setCategoriaActual(null);

                    Swal.fire({
                      title: "¡Modo Adicional Activo!",
                      text: "Ya puedes agregar productos a tu orden actual desde las categorías.",
                      icon: "success",
                      toast: true,
                      position: "top-end",
                      showConfirmButton: false,
                      timer: 4000,
                      timerProgressBar: true,
                    });

                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setMostrarIconoCarrito(true);
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
            <div
              className="cat-item"
              onClick={() => setCategoriaActual("Postres")}
            >
              <Cake size={60} className="icon-postres" />
              <p>Postres</p>
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
              {/* --- STEPER VISUAL MEJORADO --- */}
              <div className="stepper-container">
                {/* Paso 1: Entrada (Siempre activo al empezar o si se seleccionó) */}
                <div
                  className={`step ${entradaSeleccionada ? "active" : "active"}`}
                >
                  1
                </div>

                {/* Línea 1: Se activa si ya hay una entrada */}
                <div
                  className={`line ${entradaSeleccionada ? "active" : ""}`}
                ></div>

                {/* Paso 2: Segundo (Se activa solo si ya hay entrada) */}
                <div
                  className={`step ${segundoSeleccionado ? "active" : entradaSeleccionada ? "pending" : ""}`}
                >
                  2
                </div>

                {/* Línea 2: Se activa si ya hay segundo */}
                <div
                  className={`line ${segundoSeleccionado ? "active" : ""}`}
                ></div>

                {/* Paso 3: Bebida (Se activa si hay segundo) */}
                <div
                  className={`step ${bebidaSeleccionada ? "active" : segundoSeleccionado ? "pending" : ""}`}
                >
                  3
                </div>
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
                  const precioExtraBebida = bebidaSeleccionada
                    ? Number(bebidaSeleccionada.precio || 0)
                    : 0;

                  const precioCalculadoItem =
                    Number(menuDiaPrecio) + precioExtraBebida;

                  const itemMenu = {
                    id: "producto_menu_dia",
                    nombre: `Menú del Día (${segundoSeleccionado.nombre})`,
                    precio: precioCalculadoItem,
                    precioBase: Number(menuDiaPrecio),
                    cantidad: 1,
                    isMenuCompleto: true,
                    detalles: {
                      entrada: entradaSeleccionada
                        ? entradaSeleccionada.nombre
                        : "Ninguna",
                      entradaId: entradaSeleccionada
                        ? entradaSeleccionada.id
                        : "ninguna",
                      segundo: segundoSeleccionado.nombre,
                      segundoId: segundoSeleccionado.id,
                      bebida: bebidaSeleccionada
                        ? bebidaSeleccionada.nombre
                        : "Agua de cortesía",
                      bebidaId: bebidaSeleccionada
                        ? bebidaSeleccionada.id
                        : "cortesia",
                      bebidaPrecioExtra: precioExtraBebida,
                    },
                  };

                  agregarAlCarrito(itemMenu);
                  setEntradaSeleccionada(null);
                  setSegundoSeleccionado(null);
                  setBebidaSeleccionada(null);
                  setMostrarIconoCarrito(true);
                }}
              >
                {segundoSeleccionado
                  ? `➕ Agregar Menú al Carrito (S/ ${(Number(menuDiaPrecio) + (bebidaSeleccionada ? Number(bebidaSeleccionada.precio || 0) : 0)).toFixed(2)})`
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
              {/* 🌟 ORDENAR: Ponemos el refresco gratis (precio 0) siempre en primera fila */}
              {[...productosParaMostrar]
                .sort((a, b) => Number(a.precio || 0) - Number(b.precio || 0))
                .map((p) => {
                  const esEntradaActiva = entradaSeleccionada?.id === p.id;
                  const esSegundoActivo = segundoSeleccionado?.id === p.id;
                  const esBebidaActiva = bebidaSeleccionada?.id === p.id;
                  const estaSeleccionadoEnMenu =
                    esEntradaActiva || esSegundoActivo || esBebidaActiva;

                  const precioNumerico = Number(p.precio || 0);

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

                        {/* 🌟 PRECIOS TRANSPARENTES: Mostramos precio real de la carta en Menú del Día, salvo que sea el gratis (0.00) */}
                        {categoriaActual === "Menú del Día" ? (
                          <p className="precio-referencia-menu">
                            {precioNumerico === 0
                              ? "Gratis con tu menú"
                              : `Carta: S/ ${precioNumerico.toFixed(2)}`}
                          </p>
                        ) : (
                          <p className="precio">
                            S/ {precioNumerico.toFixed(2)}
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
                            {(p.categoria?.toLowerCase() === "bebidas" ||
                              p.categoria?.toLowerCase() === "cafeteria") && (
                              <button
                                className="btn-agregar"
                                onClick={() =>
                                  setBebidaSeleccionada(
                                    esBebidaActiva ? null : p,
                                  )
                                }
                              >
                                {esBebidaActiva ? "✓ Bebida Ok" : "+ Bebida"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            className={`btn-agregar ${!p.disponible ? "agotado" : ""}`}
                            onClick={() => {
                              agregarAlCarrito(p);
                              setMostrarIconoCarrito(true);
                            }}
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
                carrito.map((item) => {
                  // 🌟 DETERMINACIÓN INDIVIDUAL: ¿Este ítem ya se está cocinando en Firebase?
                  const esPlatoFijoEnCocina =
                    datosPedidoRealtime?.estado === "cocinando" &&
                    datosPedidoRealtime.items?.some(
                      (oldItem) => oldItem.idUnico === item.idUnico,
                    );

                  return (
                    <div key={item.idUnico} className="carrito-item">
                      {/* 📦 CONTENEDOR PRINCIPAL: Alinea nombre, precio y botones perfectamente */}
                      <div className="item-principal-row">
                        <div className="item-info">
                          <h4>{item.nombre}</h4>
                          <span>S/ {Number(item.precio).toFixed(2)}</span>
                        </div>

                        <div className="item-controles">
                          {!esPlatoFijoEnCocina ? (
                            <>
                              <button
                                onClick={() => restarAlCarrito(item.idUnico)}
                              >
                                -
                              </button>
                              <span className="item-cantidad">
                                {item.cantidad}
                              </span>
                              <button onClick={() => agregarAlCarrito(item)}>
                                +
                              </button>
                              <button
                                className="btn-eliminar-item"
                                onClick={() => eliminarDelCarrito(item.idUnico)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <span
                              className="item-cantidad"
                              style={{ fontWeight: "bold", padding: "0 8px" }}
                            >
                              {item.cantidad} x
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 📝 UN SOLO CAJÓN LIMPIO: Muestra la nota original persistente o permite escribir si es nuevo */}
                      <div className="item-detalles-row">
                        <input
                          type="text"
                          className="input-nota-carrito"
                          placeholder={
                            esPlatoFijoEnCocina
                              ? "Sin especificaciones"
                              : "¿Alguna especificación? (Ej: sin cebolla...)"
                          }
                          value={item.notaCliente || ""}
                          disabled={
                            esPlatoFijoEnCocina
                          } /* 🔒 Bloquea el input por completo si ya está en cocina */
                          readOnly={esPlatoFijoEnCocina}
                          onChange={(e) => {
                            const nuevaNota = e.target.value;
                            setCarrito((prevCarrito) =>
                              prevCarrito.map((c) =>
                                c.idUnico === item.idUnico
                                  ? { ...c, notaCliente: nuevaNota }
                                  : c,
                              ),
                            );
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="carrito-footer">
              <div className="total-container">
                <span>Total:</span>
                <span className="total-monto">S/ {total.toFixed(2)}</span>
              </div>
              <div className="carrito-acciones">
                {!datosPedidoRealtime ||
                datosPedidoRealtime?.estado === "pendiente" ||
                datosPedidoRealtime?.estado === "cocinando" ? (
                  <>
                    <button
                      className="btn-agregar-cerrar"
                      onClick={() => {
                        if (pedidoActivoId) {
                          revertirCambiosPedido();
                          setVerCarrito(false);
                        } else {
                          setVerCarrito(false);
                        }
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
                          setMostrarIconoCarrito(false);
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
                  </>
                ) : (
                  <p className="msg-bloqueo">
                    ¡Buenas noticias! Tu orden se está{" "}
                    <b>{datosPedidoRealtime?.estado}</b>, y ya no es posible
                    realizar modificaciones.
                  </p>
                )}
              </div>

              {pedidoActivoId &&
                datosPedidoRealtime?.estado === "pendiente" && (
                  <button
                    className="btn-eliminar-pedido"
                    onClick={eliminarPedidoCompleto}
                  >
                    🗑️ Cancelar y Eliminar Todo el Pedido
                  </button>
                )}
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

                setMostrarIconoCarrito(false);

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
                <option value="delivery">
                  Despacho por Delivery (+ S/. 1.00 Envase)
                </option>
                <option value="llevar">
                  Recoger para Llevar (+ S/. 1.00 Envase)
                </option>
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
                onClick={() => {
                  // 🌟 FIJAR LIMPIEZA ABSOLUTA AL ENVIAR RESEÑA
                  setMostrarIconoCarrito(false);
                  setCarrito([]);
                  localStorage.removeItem(`ultimoPedido_${restauranteId}`);
                  setPedidoActivoId(null);
                  setDatosPedidoRealtime(null);

                  // Finalmente mandas la calificación a tu base de datos
                  finalizarYCalificar(estrellas, comentario);
                }}
              >
                {enviando ? "Guardando..." : "Enviar y Finalizar"}
              </button>

              <button
                className="btn-omitir"
                disabled={enviando}
                onClick={() => {
                  // 🌟 FIJAR LIMPIEZA ABSOLUTA AL OMITIR
                  setMostrarIconoCarrito(false);
                  setCarrito([]);
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
      {/* MODAL DE ADVERTENCIA (¿Estás seguro?)*/}
      {mostrarConfirmarEliminar && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-alert">
            <div className="custom-modal-icon-warning">
              <span>!</span>
            </div>
            <h2>¿Estás seguro?</h2>
            <p>Este pedido se eliminará permanentemente de la cocina.</p>
            <div className="custom-modal-botones">
              <button
                className="btn-modal-confirmar-danger"
                onClick={() => eliminarPedidoCompleto(true)}
              >
                Sí, eliminar
              </button>
              <button
                className="btn-modal-cancelar"
                onClick={() => setMostrarConfirmarEliminar(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/*MODAL DE ÉXITO VERDE (Pedido Cancelado con Éxito) */}
      {mostrarExitoEliminar && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-alert">
            <div className="custom-modal-icon-success">
              <span>✓</span>
            </div>
            <h2>¡Cancelado!</h2>
            <p>
              Tu pedido ha sido cancelado y el carrito se ha vaciado
              correctamente.
            </p>
            <div className="custom-modal-botones">
              <button
                className="btn-modal-entendido"
                onClick={() => setMostrarExitoEliminar(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCliente;
