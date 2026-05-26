import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Trash2,
  Edit,
  Utensils,
  Users,
  Package,
  Image as ImageIcon,
  Save,
  Power,
  Check,
  Search,
} from "lucide-react";
import "../estilos/admin.css";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
// 🔥 SERVICIOS
import {
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  cambiarDisponibilidad,
  obtenerProductos,
} from "../servicios/productosServicio";
import {
  actualizarEstadoPedido,
  actualizarStockInsumo,
  crearInsumo,
} from "../servicios/pedidosServicio";
import {
  registrarUsuario,
  eliminarUsuario,
  escucharUsuarios,
} from "../servicios/usuariosServicio";
import { subirImagen } from "../servicios/cloudinaryServicio";

// 🔥 HOOKS
import {
  escucharProductosAdmin,
  escucharPedidos,
  escucharInsumosAdmin,
} from "../hooks/useProductos";

// 🔥 CONFIGURACIÓN
import { auth, db } from "../firebase/config";
import { doc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

// 🔐 MATRIZ DE PERMISOS Y CONFIGURACIÓN DE INTERFAZ POR ROL
export const PERMISOS_ROLES = {
  mozo: {
    verPedidos: true,
    verCaja: false,
    verInventario: false,
    seccionDefault: "pedidos",
  },
  cajero: {
    verPedidos: false,
    verCaja: true,
    verInventario: false,
    seccionDefault: "caja",
  },
  admin: {
    verMenu: true,
    verUsuarios: true,
    verPedidos: true,
    verCaja: true,
    verInventario: true,
    seccionDefault: "menu",
  },
  superadmin: {
    verMenu: true,
    verUsuarios: true,
    verPedidos: true,
    verCaja: true,
    verInventario: true,
    seccionDefault: "menu",
  },
};
const Admin = ({ seccion, setSeccion, restauranteId, rolUsuario }) => {
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [imgPreview, setImgPreview] = useState("");
  const [cargando, setCargando] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPass, setUserPass] = useState("");
  const [verPassword, setVerPassword] = useState({});
  const [userRol, setUserRol] = useState("");
  const [filtroCaja, setFiltroCaja] = useState("dia");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pedidoDetalle, setPedidoDetalle] = useState(null);
  const [publicIdExistente, setPublicIdExistente] = useState(null);
  const [descripcion, setDescripcion] = useState("");
  //estados para inventario
  const [insumos, setInsumos] = useState([]);
  const [nuevoInsumo, setNuevoInsumo] = useState({
    nombre: "",
    stock_actual: 0,
    stock_minimo: 0,
    unidad_medida: "",
  });
  const [busquedaInsumo, setBusquedaInsumo] = useState("");
  const [operacionStock, setOperacionStock] = useState({});
  const [tipoFiltroInventario, setTipoFiltroInventario] = useState("insumos");
  //estados opara el menu
  const [menuDiaPrecio, setMenuDiaPrecio] = useState(15);
  const [menuDiaActivo, setMenuDiaActivo] = useState(true);
  const fileInputRef = useRef(null);
  const [notificacionMenu, setNotificacionMenu] = useState({
    mostrar: false,
    mensaje: "",
  });
  const [nombreLocal, setNombreLocal] = useState("");

  // cargar datos de bd
  useEffect(() => {
    if (!restauranteId || !rolUsuario) return;

    const isAdmin = rolUsuario === "admin" || rolUsuario === "superadmin";
    console.log(
      `[Firebase] Conectando a: ${restauranteId} (Admin: ${isAdmin})`,
    );

    let unsubProd = () => {};
    let unsubInsumos = () => {};
    let unsubPed = () => {};
    let unsubUser = () => {};
    let unsubConfig = () => {};
    let unsubDatos = () => {};

    try {
      // 1. PRODUCTOS
      if (isAdmin) {
        unsubProd = escucharProductosAdmin(restauranteId, setProductos);
      } else {
        unsubProd = obtenerProductos(restauranteId, categoria, setProductos);
      }
      // 2. inventario
      if (isAdmin) {
        unsubInsumos = escucharInsumosAdmin(restauranteId, setInsumos);
      }

      // 3. PEDIDOS
      unsubPed = escucharPedidos(restauranteId, setPedidos);

      // 4. USUARIOS (Admin)
      if (isAdmin) {
        unsubUser = escucharUsuarios(restauranteId, setUsuarios);
      }

      // 5. CONFIGURACIÓN MENÚ DEL DÍA
      const configRef = doc(
        db,
        "restaurantes",
        restauranteId,
        "configuraciones",
        "menu_dia",
      );
      unsubConfig = onSnapshot(configRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setMenuDiaPrecio(data.precio ?? 15);
          setMenuDiaActivo(data.activo ?? false);
        }
      });

      // 6. 🏦 NOMBRE DEL RESTAURANTE (MULTIPUNTO) - ¡AHORA ADENTRO PROTEGIDO!
      const datosRef = doc(
        db,
        "restaurantes",
        restauranteId,
        "configuraciones",
        "datos",
      );
      unsubDatos = onSnapshot(datosRef, (snapshot) => {
        if (snapshot.exists()) {
          setNombreLocal(snapshot.data().nombre || "");
        }
      });
    } catch (error) {
      console.error("Error al suscribirse a Firebase:", error);
    }

    return () => {
      unsubProd();
      unsubInsumos();
      unsubPed();
      unsubUser();
      unsubConfig();
      unsubDatos();
    };
  }, [restauranteId, rolUsuario, categoria]);

  //Funcion de agregar menu del dia
  const guardarConfigMenuDia = async (nuevoPrecio, nuevoEstado) => {
    if (!restauranteId) return;
    try {
      const configRef = doc(
        db,
        "restaurantes",
        restauranteId,
        "configuraciones",
        "menu_dia",
      );
      await setDoc(
        configRef,
        {
          precio: Number(nuevoPrecio),
          activo: nuevoEstado,
          ultimaActualizacion: new Date(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Error al guardar la configuración del menú:", error);
    }
  };
  //Funcion PRODUCTOS
  const guardarProducto = async (e) => {
    e.preventDefault();

    console.log("--- DATOS DE AUDITORÍA ---");
    console.log("Restaurante ID:", restauranteId);
    console.log("Rol del Usuario:", rolUsuario);
    console.log("ID en edición:", editandoId);
    console.log("--------------------------");

    // Validaciones con alertas centradas
    if (rolUsuario === "mozo") {
      return Swal.fire({
        icon: "error",
        title: "Acceso denegado",
        text: "No tienes permisos para realizar esta acción.",
        confirmButtonColor: "#6366f1",
      });
    }

    if (!nombre.trim() || !precio) {
      return Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Por favor, completa el nombre y el precio del plato.",
        confirmButtonColor: "#6366f1",
      });
    }

    if (!restauranteId) {
      return Swal.fire({
        icon: "error",
        title: "Error de sistema",
        text: "ID de restaurante no detectado. Reintenta el login.",
        confirmButtonColor: "#6366f1",
      });
    }

    if (cargando) return;

    try {
      setCargando(true);

      let urlFinal = editandoId ? imgPreview : "";
      let nuevoPublicId = publicIdExistente;

      if (archivo) {
        const resultado = await subirImagen(
          archivo,
          editandoId ? publicIdExistente : null,
        );
        if (!resultado) throw new Error("Error al subir la imagen");
        urlFinal = resultado.url;
        nuevoPublicId = resultado.public_id;
      }

      const datos = {
        nombre: nombre.trim(),
        precio: Number(precio),
        descripcion: descripcion.trim(),
        categoria,
        imagenUrl: urlFinal || "",
        cloudinaryId: nuevoPublicId,
        insumoId: insumoSeleccionado,
      };

      if (editandoId) {
        await actualizarProducto(editandoId, datos, restauranteId);
        Swal.fire({
          icon: "success",
          title: "¡Actualizado!",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await crearProducto(datos, restauranteId);
        Swal.fire({
          icon: "success",
          title: "¡Creado!",
          text: "El producto ha sido registrado con éxito.",
          showConfirmButton: false,
          timer: 2000,
          position: "center",
        });
      }

      // Limpieza de estados tras éxito
      setNombre("");
      setPrecio("");
      setDescripcion("");
      setArchivo(null);
      setImgPreview("");
      setEditandoId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      // Alerta de error en el proceso
      Swal.fire({
        icon: "error",
        title: "Hubo un problema",
        text: "Error: " + error.message,
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setCargando(false);
    }
  };
  //Funcion insumos
  const registrarNuevoInsumo = async () => {
    // Validación profesional
    if (!nuevoInsumo.nombre || !nuevoInsumo.nombre.trim()) {
      return Swal.fire(
        "Atención",
        "Por favor, ingresa el nombre del insumo.",
        "warning",
      );
    }

    // Si por alguna razón está vacío, asegurar que tome 'kg' del selector predeterminado
    const unidadFinal = nuevoInsumo.unidad_medida || "kg";

    try {
      const dataAGuardar = {
        nombre: nuevoInsumo.nombre.trim(),
        stock_actual: Number(nuevoInsumo.stock_actual) || 0,
        stock_minimo: Number(nuevoInsumo.stock_minimo) || 0,
        unidad_medida: unidadFinal,
      };

      await crearInsumo(restauranteId, dataAGuardar);

      // Resetear formulario tras éxito conservando la coherencia del select
      setNuevoInsumo({
        nombre: "",
        stock_actual: "",
        stock_minimo: 0,
        unidad_medida: "kg",
      });

      Swal.fire({
        icon: "success",
        title: "Insumo Registrado",
        text: "El material se guardó correctamente en el almacén.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error al registrar insumo:", error);
      // 🚨 Alerta idéntica a tus capturas para estandarizar fallos de base de datos
      Swal.fire(
        "Error",
        "Hubo un fallo al sincronizar con la base de datos.",
        "error",
      );
    }
  };
  //funcion cabcelar edidcion
  const cancelarEdicion = () => {
    setEditandoId(null);
    setNombre("");
    setPrecio("");
    setDescripcion("");
    setCategoria("Comidas");
    setArchivo(null);
    setImgPreview(null);
    setPublicIdExistente(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  //buscador
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideNombre = (p.nombre || "")
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      const coincideCategoria =
        filtroCategoria === "" || p.categoria === filtroCategoria;

      return coincideNombre && coincideCategoria;
    });
  }, [productos, busqueda, filtroCategoria]);
  //edicion
  const prepararEdicion = (p) => {
    setEditandoId(p.id);
    setNombre(p.nombre);
    setPrecio(p.precio);
    setCategoria(p.categoria);
    setImgPreview(p.imagenUrl);
    setPublicIdExistente(p.cloudinaryId || null);
    setDescripcion(p.descripcion || "");
  };
  // 1. Funcion de borrar
  const manejarEliminar = (id, publicIdCloudinary) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "Este plato y su imagen se eliminarán permanentemente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          console.log("ID del producto:", id);
          console.log("publicIdCloudinary:", publicIdCloudinary);

          await eliminarProducto(id, restauranteId);

          if (publicIdCloudinary) {
            const response = await fetch("/api/cloudinary/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ public_id: publicIdCloudinary }),
            });
            console.log(
              "Respuesta del endpoint:",
              response.status,
              await response.text(),
            );
          }
          Swal.fire({
            title: "Eliminado",
            text: "El producto y su imagen han sido borrados.",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
        } catch (error) {
          Swal.fire("Error", "No se pudo eliminar: " + error.message, "error");
        }
      }
    });
  };
  const manejarClickImagen = () => {
    fileInputRef.current.click();
  };
  // 👤 USUARIOS
  const registrarAdmin = async (e) => {
    e.preventDefault();

    if (!userEmail.trim() || !userPass.trim()) {
      return Swal.fire({
        icon: "warning",
        title: "Campos vacíos",
        text: "Email y contraseña son obligatorios.",
      });
    }

    if (userPass.length < 6) {
      return Swal.fire({
        icon: "warning",
        title: "Contraseña débil",
        text: "Debe tener al menos 6 caracteres.",
      });
    }

    // 🛡️ CORREGIDO: Usamos 'restauranteId' (en singular, como viene de tus props)
    if (!restauranteId) {
      return Swal.fire({
        icon: "error",
        title: "Error de contexto",
        text: "No se detectó el ID del restaurante.",
      });
    }

    if (!userRol) {
      return Swal.fire({
        icon: "warning",
        title: "Rol no seleccionado",
        text: "Debes elegir un rol para el nuevo usuario.",
        confirmButtonColor: "#6366f1",
      });
    }

    if (cargando) return;

    try {
      setCargando(true);

      // 🔑 GENERACIÓN DEL PIN LOCAL PARA EL OPERADOR
      // ¡MEJORADO! Ahora los administradores también generan un PIN de 4 dígitos basado en su contraseña
      // o uno aleatorio para que puedan usar el teclado numérico de LoginPin sin problemas.
      let pinGenerado = "";
      if (userRol === "admin") {
        // Si es admin, extrae los últimos 4 dígitos de su contraseña (o usa los que ya tiene)
        pinGenerado =
          userPass.slice(-4).replace(/\D/g, "") ||
          Math.floor(1000 + Math.random() * 9000).toString();
      } else {
        // Si es mozo o cajero, genera su número aleatorio de 4 dígitos
        pinGenerado = Math.floor(1000 + Math.random() * 9000).toString();
      }

      // 🔥 Se añade 'pinGenerado' como quinto parámetro al servicio existente
      await registrarUsuario(
        userEmail,
        userPass,
        userRol,
        restauranteId, // 🛡️ CORREGIDO AQUÍ TAMBIÉN
        pinGenerado,
      );

      // Desplegamos el aviso de éxito con el PIN correspondiente
      Swal.fire({
        icon: "success",
        title: "¡Registro Exitoso!",
        html: `Se ha creado el perfil de <strong>${userRol.toUpperCase()}</strong> para ${userEmail}.<br/><br/>
               🔑 <strong>PIN DE ACCESO TÁCTIL: <span style="font-size: 20px; color: #6366f1;">${pinGenerado}</span></strong>`,
        confirmButtonColor: "#6366f1",
      });

      setUserEmail("");
      setUserPass("");
      setUserRol("");
    } catch (error) {
      console.error("Error capturado en formulario:", error);
      let mensajeError = error.message;
      if (
        error.code === "auth/email-already-in-use" ||
        error.message?.includes("already-in-use")
      ) {
        mensajeError = "Este correo ya está registrado en el sistema.";
      }
      Swal.fire({
        icon: "error",
        title: "Error al registrar",
        text: mensajeError,
      });
    } finally {
      setCargando(false);
    }
  };
  // 📦 PEDIDOS
  const cambiarEstado = async (id, nuevoEstado, itemsPedido = []) => {
    try {
      await actualizarEstadoPedido(restauranteId, id, nuevoEstado, itemsPedido);

      Swal.fire({
        icon: "success",
        title: "Estado Actualizado",
        text: `Orden en etapa: ${nuevoEstado.toUpperCase()}`,
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo actualizar el estado", "error");
    }
  };
  //funcion de caja
  const obtenerEstadisticasCaja = (listaPedidos, periodo) => {
    const ahora = new Date();
    const filtrados = listaPedidos.filter((p) => {
      const estadosValidos = ["entregado", "finalizado", "cancelado"];
      if (!estadosValidos.includes(p.estado) || !p.fecha?.toDate) return false;
      const fechaP = p.fecha.toDate();

      if (periodo === "dia")
        return fechaP.toDateString() === ahora.toDateString();
      if (periodo === "semana") {
        const sieteDias = new Date();
        sieteDias.setDate(ahora.getDate() - 7);
        return fechaP >= sieteDias;
      }
      if (periodo === "mes") {
        return (
          fechaP.getMonth() === ahora.getMonth() &&
          fechaP.getFullYear() === ahora.getFullYear()
        );
      }
      if (periodo === "anio")
        return fechaP.getFullYear() === coordinator.getFullYear();
      return true;
    });
    if (periodo === "cancelados") {
      const soloCancelados = filtrados.filter((p) => p.estado === "cancelado");
      return {
        monto: "0.00",
        cantidad: soloCancelados.length,
        filtrados: soloCancelados,
      };
    }
    const monto = filtrados
      .reduce(
        (acc, p) => acc + (p.estado === "cancelado" ? 0 : Number(p.total)),
        0,
      )
      .toFixed(2);
    const cantidad = filtrados.length;

    return { monto, cantidad, filtrados };
  };

  //funcion de exporta a excel
  const exportarCajaExcel = (datos, nombreArchivo) => {
    const dataFormateada = datos.map((p) => ({
      Fecha: p.fecha?.toDate()?.toLocaleString() || "N/A",
      Cliente: p.cliente?.nombre || "Anonimo",
      Tipo: p.cliente?.tipo || "N/A",
      Referencia: p.cliente?.referencia || "N/A",
      Items: p.items?.map((i) => `${i.cantidad}x ${i.nombre}`).join(", "),
      Total: Number(p.total),
      Rating: p.rating || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(dataFormateada);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
  };
  //DISPONIBILIDAD
  const manejarDisponibilidad = async (id, estadoActual, restauranteId) => {
    try {
      await cambiarDisponibilidad(id, !estadoActual, restauranteId);
      const nuevoEstado = !estadoActual;

      Swal.fire({
        title: nuevoEstado ? "Plato Activado" : "Plato Agotado",
        icon: "success",
        timer: 800,
        showConfirmButton: false,
        position: "center",
      });
    } catch (error) {
      Swal.fire("Error", "No se pudo cambiar el estado", "error");
    }
  };
  //eliminacion de usuarios
  const confirmarEliminarUser = (email) => {
    if (email === auth.currentUser.email) {
      return Swal.fire(
        "Acción no permitida",
        "No puedes eliminar tu propia cuenta de administrador.",
        "warning",
      );
    }

    Swal.fire({
      title: "¿Eliminar personal?",
      text: `El usuario ${email} perderá acceso al sistema.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await eliminarUsuario(email, restauranteId);
          Swal.fire("Eliminado", "El usuario ha sido removido.", "success");
        } catch (error) {
          Swal.fire("Error", "No se pudo eliminar: " + error.message, "error");
        }
      }
    });
  };

  if (!restauranteId || !rolUsuario) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Sincronizando credenciales...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* SECCIÓN MENÚ */}
      {seccion === "menu" && (
        <div className="admin-section">
          <div className="tarjeta-control-menu-dia">
            <div className="menu-dia-info-grupo">
              <span className="menu-dia-icono">⚙️</span>
              <div>
                <h4 className="menu-dia-titulo">Configuración Menú del Día</h4>
                <p className="menu-dia-subtitulo">
                  Control global de disponibilidad y costo
                </p>
              </div>
            </div>

            <div className="menu-dia-controles-grupo">
              {/* Input Precio */}
              <div className="menu-dia-precio-box">
                <span className="menu-dia-moneda">S/</span>
                <input
                  type="number"
                  className="menu-dia-input-precio"
                  value={menuDiaPrecio}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMenuDiaPrecio(v);
                    guardarConfigMenuDia(v, menuDiaActivo);
                  }}
                />
              </div>

              {/* Switch Encendido/Apagado */}
              <div className="menu-dia-switch-box">
                <span
                  className={`menu-dia-estado-texto ${menuDiaActivo ? "activo" : "apagado"}`}
                >
                  {menuDiaActivo ? "ACTIVO" : "APAGADO"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nuevoEstado = !menuDiaActivo;
                    setMenuDiaActivo(nuevoEstado);
                    guardarConfigMenuDia(menuDiaPrecio, nuevoEstado);

                    // 🌟 Lanzamos el mensaje bonito usando el nuevo estado
                    setNotificacionMenu({
                      mostrar: true,
                      mensaje: nuevoEstado
                        ? "Menú activado correctamente"
                        : "Menú desactivado correctamente",
                    });

                    // ⏱️ Se limpia automáticamente a los 2 segundos sin trabar el switch
                    setTimeout(() => {
                      setNotificacionMenu({ mostrar: false, mensaje: "" });
                    }, 2000);
                  }}
                  className={`menu-dia-switch-btn ${menuDiaActivo ? "is-active" : ""}`}
                >
                  <div className="menu-dia-switch-bola" />
                </button>
              </div>

              {/* 🌟 MENSAJE BONITO EN EL CENTRO CON LA NUEVA CLASE CSS */}
              {notificacionMenu.mostrar && (
                <div className="menu-dia-notificacion-toast">
                  {notificacionMenu.mensaje}
                </div>
              )}
            </div>
          </div>

          <h2 className="titulo-seccion">
            {editandoId ? "Editar Producto" : "Nuevo Plato"}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();

              if (!editandoId && !archivo) {
                Swal.fire({
                  title: "¡Imagen Obligatoria!",
                  text: "Debe subir una foto para registrar el plato. Use el botón 'Subir Imagen' de abajo.",
                  icon: "warning",
                  confirmButtonColor: "#10b981",
                  confirmButtonText: "OK",
                });
                return;
              }

              guardarProducto(e);
            }}
            className="form-admin-pro"
          >
            <input
              className="input-pro"
              required
              maxLength={45}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del plato (Máx. 45 caracteres)"
            />

            <input
              className="input-pro"
              type="number"
              required
              min={0.5}
              max={999}
              step="0.01"
              value={precio}
              onChange={(e) => {
                const valor = e.target.value;
                if (valor.split(".")[0].length > 3) {
                  return;
                }
                setPrecio(valor);
              }}
              placeholder="Precio (S/)"
            />

            <select
              className="select-pro"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="" disabled>
                Seleccionar categoría
              </option>
              <option value="Comidas">Comidas</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Entradas">Entradas</option>
              <option value="Cafeteria">Cafetería</option>
              <option value="Postres">Postres</option>{" "}
            </select>

            <textarea
              className="textarea-pro"
              maxLength={150}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción del producto o ingredientes del plato... (Máx. 150 caracteres)"
              rows={3}
            />

            <div className="upload-box">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setArchivo(file);
                    setImgPreview(URL.createObjectURL(file));
                  }
                }}
              />

              <button
                type="button"
                className={`btn-upload-pro ${imgPreview ? "success" : ""}`}
                onClick={manejarClickImagen}
                disabled={cargando}
              >
                {imgPreview ? <Check size={18} /> : <ImageIcon size={18} />}
                {imgPreview ? " Imagen Cargada" : " Subir Imagen (Obligatorio)"}
              </button>

              {imgPreview && (
                <div className="preview-imagen-container">
                  <img src={imgPreview} alt="preview" />
                </div>
              )}
            </div>

            <div className="admin-acciones-mix">
              <button
                type="submit"
                className="btn-guardar-pro-compacto"
                disabled={!restauranteId || cargando}
              >
                {cargando ? (
                  "..."
                ) : editandoId ? (
                  <Edit size={18} />
                ) : (
                  <Save size={18} />
                )}
                <span>{editandoId ? " Act." : " Guardar"}</span>
              </button>

              <div className="filtro-container-pro">
                <select
                  className="select-filtro-tabla"
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Comidas">Comidas</option>
                  <option value="Bebidas">Bebidas</option>
                  <option value="Entradas">Entradas</option>
                  <option value="Cafeteria">Cafetería</option>
                  <option value="Postres">Postres</option>{" "}
                </select>
              </div>

              {/* BUSCADOR */}
              <div className="buscador-container-pro">
                <Search size={18} className="icon-search" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="input-buscar-interno"
                />
              </div>

              {editandoId && (
                <button
                  type="button"
                  className="btn-cancelar-pro-circular"
                  onClick={cancelarEdicion}
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          <div className="tabla-container-pro">
            <table className="tabla-admin-pro">
              <thead>
                <tr>
                  <th>PLATO</th>
                  <th>DESCRIPCIÓN</th> <th>PRECIO</th>
                  <th>DISP.</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((p) => (
                  <tr key={p.id}>
                    <td className="td-plato">
                      <img
                        src={p.imagenUrl || "https://via.placeholder.com/50"}
                        alt={p.nombre}
                        className="img-mini-pro"
                      />
                      <span>{p.nombre}</span>
                    </td>

                    {/* Celda de Descripción */}
                    <td>
                      {p.descripcion ? (
                        <div className="td-descripcion">{p.descripcion}</div>
                      ) : (
                        <div className="detalles-producto-admin">
                          Sin descripción
                        </div>
                      )}
                    </td>

                    <td className="td-precio">
                      S/ {Number(p.precio).toFixed(2)}
                    </td>

                    <td>
                      <button
                        className="btn-status-pro"
                        disabled={cargando}
                        onClick={() =>
                          manejarDisponibilidad(
                            p.id,
                            p.disponible,
                            restauranteId,
                          )
                        }
                      >
                        <Power
                          size={18}
                          color={p.disponible ? "#10b981" : "#ef4444"}
                        />
                      </button>
                    </td>

                    {/* 🌟 ENVOLVEMOS LOS BOTONES EN EL CONTAINER PARA ALINEACIÓN PERFECTA */}
                    <td className="acciones-pro">
                      <div className="acciones-pro-container">
                        <button
                          className="btn-edit"
                          onClick={() => prepararEdicion(p)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="btn-delete" /* Se mapea con tu clase de CSS */
                          onClick={() => manejarEliminar(p.id, p.cloudinaryId)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* SECCIÓN INVENTARIO */}
      {seccion === "inventario" && (
        <div className="admin-section inventario-container">
          <h2 className="titulo-seccion">Control de Inventario Global</h2>

          {/* Formulario de creación limpio (Solo registra Insumos con Selector de Medida) */}
          <div className="admin-form-inventario">
            <input
              type="text"
              placeholder="Nombre del insumo (Ej: Cebolla)"
              value={nuevoInsumo.nombre || ""}
              onChange={(e) =>
                setNuevoInsumo({ ...nuevoInsumo, nombre: e.target.value })
              }
            />
            <input
              type="number"
              onKeyDown={(e) =>
                ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()
              }
              placeholder="Stock Inicial (Cantidad)"
              value={nuevoInsumo.stock_actual || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setNuevoInsumo({
                  ...nuevoInsumo,
                  stock_actual: val ? parseInt(val, 10) : "",
                });
              }}
            />

            {/* 🔄 Selector tipo Spinner/Drop-down para la unidad de medida */}
            <select
              className="select-filtro-tabla"
              value={nuevoInsumo.unidad_medida || "kg"}
              onChange={(e) =>
                setNuevoInsumo({
                  ...nuevoInsumo,
                  unidad_medida: e.target.value,
                })
              }
            >
              <option value="kg">Kilogramos (kg)</option>
              <option value="und">Unidades (und)</option>
            </select>

            <button
              type="button"
              className="btn-guardar-inventario"
              onClick={registrarNuevoInsumo}
            >
              Registrar Insumo
            </button>
          </div>

          {/* 🎛️ FILTROS Y BUSQUEDA UNIFICADA */}
          <div className="inventario-filtros-grupo">
            <div className="buscador-inventario-subcontainer">
              <input
                type="text"
                className="input-busqueda-insumo"
                placeholder="🔍 Buscar por nombre de insumo o producto..."
                value={busquedaInsumo}
                onChange={(e) => setBusquedaInsumo(e.target.value)}
              />
            </div>

            <div className="selector-filtro-container">
              <select
                className="select-filtro-tabla"
                value={tipoFiltroInventario}
                onChange={(e) => setTipoFiltroInventario(e.target.value)}
              >
                <option value="todos">📋 Mostrar Todo el Inventario</option>
                <option value="insumos">🥕 Solo Insumos de Cocina</option>
                <option value="Comidas">🍳 Platos / Comidas</option>
                <option value="Bebidas">🍺 Bebidas / Líquidos</option>
                <option value="Entradas">🥗 Entradas</option>
                <option value="Cafeteria">☕ Cafetería</option>
                <option value="Postres">🍰 Postres</option>
              </select>
            </div>
          </div>

          {/* Tabla de Control Única con Alertas Inteligentes */}
          <table className="tabla-insumos">
            <thead>
              <tr>
                <th>PRODUCTO / INSUMO</th>
                <th>CATEGORÍA</th>{" "}
                {/* 📌 Cambiado de TIPO / ORIGEN a CATEGORÍA */}
                <th>STOCK ACTUAL</th>
                <th>ACCIONES DE MOVIMIENTO</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // 🛡️ CONTROL DE ERRORES DE REFERENCIA: Nos aseguramos de mapear las variables correctas
                const listaInsumosMapeada = (insumos || []).map((i) => ({
                  ...i,
                  esInsumo: true,
                  categoria: "insumos",
                }));

                // Aquí cambiamos cualquier remanente que buscaras de "productosAdmin" a tu estado real "productos"
                const listaProductosMapeada = (productos || []).map((p) => ({
                  ...p,
                  esInsumo: false,
                }));

                const inventarioGlobal = [
                  ...listaInsumosMapeada,
                  ...listaProductosMapeada,
                ];

                return inventarioGlobal
                  .filter((item) => {
                    if (!item.nombre) return false;
                    const cumpleBusqueda = item.nombre
                      .toLowerCase()
                      .includes(busquedaInsumo.toLowerCase());
                    if (tipoFiltroInventario === "todos") return cumpleBusqueda;
                    if (tipoFiltroInventario === "insumos")
                      return cumpleBusqueda && item.esInsumo;
                    return (
                      cumpleBusqueda &&
                      !item.esInsumo &&
                      item.categoria === tipoFiltroInventario
                    );
                  })
                  .map((item) => {
                    const stockNumerico = Number(item.stock_actual) || 0;
                    const esCritico = stockNumerico <= 4;

                    // Si es un producto del menú, por defecto inicializa su acción en "salida"
                    const estadoFila = operacionStock[item.id] || {
                      cantidad: "",
                      tipo: item.esInsumo ? "entrada" : "salida",
                    };

                    const ejecutarMovimiento = async () => {
                      const cant = parseInt(estadoFila.cantidad, 10);
                      if (!cant || cant <= 0) {
                        return Swal.fire(
                          "Atención",
                          "Ingresa una cantidad válida mayor a 0",
                          "warning",
                        );
                      }

                      const multiplicador =
                        estadoFila.tipo === "entrada" ? 1 : -1;
                      const cantidadFinal = cant * multiplicador;

                      try {
                        if (item.esInsumo) {
                          // Validamos que exista la función antes de invocarla
                          if (typeof actualizarStockInsumo === "function") {
                            await actualizarStockInsumo(
                              restauranteId,
                              item.id,
                              cantidadFinal,
                            );
                          } else {
                            throw new ReferenceError(
                              "actualizarStockInsumo is not defined",
                            );
                          }
                        } else {
                          if (typeof actualizarProducto === "function") {
                            await actualizarProducto(
                              item.id,
                              { stock_actual: increment(cantidadFinal) },
                              restauranteId,
                            );
                          } else {
                            throw new ReferenceError(
                              "actualizarProducto is not defined",
                            );
                          }
                        }

                        setOperacionStock({
                          ...operacionStock,
                          [item.id]: {
                            cantidad: "",
                            tipo: item.esInsumo ? "entrada" : "salida",
                          },
                        });

                        Swal.fire({
                          icon: "success",
                          title: "Movimiento Aplicado",
                          text: `Se registró la ${estadoFila.tipo} de manera exitosa.`,
                          timer: 1500,
                          showConfirmButton: false,
                        });
                      } catch (err) {
                        console.error(err);
                        // 🚨 Usamos el string exacto que saltó en tu captura de pantalla de error
                        Swal.fire(
                          "Error",
                          "Hubo un fallo al sincronizar con la base de datos.",
                          "error",
                        );
                      }
                    };

                    return (
                      <tr key={item.id}>
                        <td className="celda-nombre-elemento">{item.nombre}</td>
                        <td>
                          <span
                            className={`badge-categoria ${item.esInsumo ? "insumo" : "producto"}`}
                          >
                            {item.esInsumo
                              ? "Materia Prima"
                              : `${item.categoria}`}
                          </span>
                        </td>
                        <td
                          className={
                            esCritico
                              ? "stock-alerta celda-stock-valor"
                              : "celda-stock-valor"
                          }
                        >
                          {stockNumerico} {item.unidad_medida || "und"}
                          {esCritico && (
                            <span className="texto-alerta-bajo">⚠️ ¡Bajo!</span>
                          )}
                        </td>
                        <td>
                          <div className="contenedor-acciones-stock">
                            <select
                              className="select-movimiento-tipo"
                              value={estadoFila.tipo}
                              onChange={(e) =>
                                setOperacionStock({
                                  ...operacionStock,
                                  [item.id]: {
                                    ...estadoFila,
                                    tipo: e.target.value,
                                  },
                                })
                              }
                            >
                              {/* 🚫 Si es Insumo muestra todo. Si es Menú del Producto, SOLO Salida y Transferencia */}
                              {item.esInsumo && (
                                <option value="entrada">📥 Entrada</option>
                              )}
                              <option value="salida">🍳 Salida Cocina</option>
                              <option value="transferencia">
                                📦 Transferencia
                              </option>
                            </select>

                            <input
                              type="number"
                              className="input-movimiento-cantidad"
                              placeholder="Cantidad"
                              min="1"
                              onKeyDown={(e) =>
                                ["e", "E", "+", "-", "."].includes(e.key) &&
                                e.preventDefault()
                              }
                              value={estadoFila.cantidad}
                              onChange={(e) => {
                                const valorLimpio = e.target.value.replace(
                                  /[^0-9]/g,
                                  "",
                                );
                                setOperacionStock({
                                  ...operacionStock,
                                  [item.id]: {
                                    ...estadoFila,
                                    cantidad: valorLimpio,
                                  },
                                });
                              }}
                            />

                            <button
                              type="button"
                              className="btn-aplicar-movimiento"
                              onClick={ejecutarMovimiento}
                            >
                              Aplicar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
              })()}
            </tbody>
          </table>
        </div>
      )}
      {/* SECCIÓN PEDIDOS*/}
      {seccion === "pedidos" && (
        <div className="admin-section">
          <h2 className="titulo-seccion">📦 Pedidos pendientes </h2>

          {pedidos.filter(
            (p) => p.estado !== "entregado" && p.estado !== "cancelado",
          ).length === 0 ? (
            <div className="no-data">
              Todo en orden. No hay pedidos recientes.
            </div>
          ) : (
            <div className="grid-admin">
              {pedidos
                .filter(
                  (p) => p.estado !== "entregado" && p.estado !== "cancelado",
                )
                .filter(
                  (value, index, self) =>
                    index === self.findIndex((t) => t.id === value.id),
                ) // <--- FILTRO DE SEGURIDAD PARA ID DUPLICADOS
                .sort(
                  (a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0),
                )
                .map((p) => (
                  <div key={p.id} className="card-admin">
                    {/* Cabecera limpia: Nombre a la izquierda, Badge a la derecha */}
                    <div className="card-header">
                      <h3>{p.cliente?.nombre || "Cliente"}</h3>
                      <span
                        className={`status-badge ${(p.estado || "pendiente").toLowerCase()}`}
                      >
                        {(p.estado || "pendiente").toUpperCase()}
                      </span>
                    </div>

                    {/* Información de despacho y contacto */}
                    <div className="datos-despacho-admin">
                      {p.cliente?.tipo === "Delivery" ? (
                        <>
                          <p className="texto-tipo-entrega">
                            🛵 Delivery:{" "}
                            {p.cliente?.direccion ||
                              p.cliente?.referencia ||
                              "Dirección no registrada"}
                          </p>

                          {p.cliente?.telefono &&
                            p.cliente.telefono !== "No provisto" && (
                              <div className="container-telefono-whatsapp">
                                <p className="texto-telefono-admin">
                                  📞 {p.cliente.telefono}
                                </p>
                                <a
                                  href={`https://wa.me/51${p.cliente.telefono}?text=${encodeURIComponent(
                                    `¡Hola *${p.cliente?.nombre || "Cliente"}*! 🌟 Recibimos tu pedido de *${nombreLocal || "el restaurante"}*.\n\n` +
                                      `*Detalle:* ${p.items?.map((i) => `${i.cantidad}x ${i.nombre}`).join(", ") || ""}\n` +
                                      `*Total:* S/ ${Number(p.total || 0).toFixed(2)}\n\n` +
                                      `Por favor, confírmanos tu dirección exacta en tiempo actual para despachar tu orden lo antes posible. ¡Muchas gracias! 🛵`,
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn-whatsapp-admin"
                                  title="Coordinar entrega por WhatsApp"
                                >
                                  💬 WhatsApp
                                </a>
                              </div>
                            )}
                        </>
                      ) : (
                        <p className="texto-tipo-entrega">
                          📍 Mesa: {p.cliente?.mesa || "Mesa"}
                        </p>
                      )}
                    </div>

                    {/* Cuerpo del pedido: Items */}
                    <div className="items-pedido">
                      {p.items?.map((item, index) => {
                        const safeItem = {
                          ...item,
                          detalles: item.detalles || null,
                        };

                        return (
                          <div key={index} style={{ marginBottom: "8px" }}>
                            <p className="item-fila">
                              <span className="cantidad">
                                {safeItem.cantidad}x
                              </span>
                              <span className="nombre">{safeItem.nombre}</span>
                            </p>

                            {!safeItem.detalles && safeItem.descripcion && (
                              <span className="detalles-menu-admin">
                                {safeItem.descripcion}
                              </span>
                            )}

                            {safeItem.detalles && (
                              <span className="detalles-menu-admin">
                                🍲 E: {safeItem.detalles.entrada || "-"} | 🍛 S:{" "}
                                {safeItem.detalles.segundo || "-"} | 🥤 B:{" "}
                                {safeItem.detalles.bebida || "-"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      <hr />
                      <p className="total-pedido">
                        <strong>
                          Total: S/ {Number(p.total || 0).toFixed(2)}
                        </strong>
                      </p>
                    </div>

                    {/* Botones de acción inferiores */}
                    <div className="acciones-pedido">
                      {/* Botón Preparar */}
                      {p.estado === "pendiente" && (
                        <button
                          className="btn-primary"
                          disabled={cargando}
                          onClick={() => cambiarEstado(p.id, "cocinando")} // No necesita items
                        >
                          👨‍🍳 Preparar
                        </button>
                      )}

                      {/* Botón Finalizar y Cobrar */}
                      {p.estado === "cocinando" && (
                        <button
                          className="btn-success"
                          disabled={cargando}
                          onClick={() =>
                            cambiarEstado(p.id, "entregado", p.items)
                          } // AQUÍ ESTÁ EL CAMBIO
                        >
                          ✅ Finalizar y Cobrar
                        </button>
                      )}

                      {/* Botón Revertir */}
                      {p.estado === "cocinando" && (
                        <button
                          className="btn-revertir"
                          disabled={cargando}
                          style={{ marginLeft: "8px" }}
                          onClick={() => cambiarEstado(p.id, "pendiente")} // No necesita items
                        >
                          🔃 Revertir
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN CAJA */}
      {seccion === "caja" && (
        <div className="admin-section">
          <div className="admin-header-flex">
            <h2 className="titulo-principal">💰 Control de Caja y Ventas</h2>

            <div className="filtro-admin-wrapper">
              <label className="label-filtro">Filtrar ventas por:</label>
              <div className="filtros-caja-container">
                <select
                  value={filtroCaja}
                  onChange={(e) => setFiltroCaja(e.target.value)}
                  className="select-admin-filtro"
                >
                  <option value="dia">Ventas del Día</option>
                  <option value="semana">Ventas de la Semana</option>
                  <option value="mes">Mes Actual</option>
                  <option value="total">Ventas Total</option>
                  <option value="cancelados">❌ Solo Cancelados</option>
                </select>
                <button
                  onClick={() => {
                    const { filtrados } = obtenerEstadisticasCaja(
                      pedidos,
                      filtroCaja,
                    );
                    exportarCajaExcel(filtrados, `Reporte_Caja_${filtroCaja}`);
                  }}
                  className="btn-exportar-excel"
                  disabled={pedidos.length === 0}
                >
                  📊 Exportar Excel
                </button>
              </div>
            </div>
          </div>

          <div className="resumen-ventas-grid">
            <div className="card-admin card-resumen">
              <h3>
                VENTAS (
                {filtroCaja === "dia" ? "HOY" : filtroCaja.toUpperCase()})
              </h3>
              <p className="monto-dia">
                S/{" "}
                {Number(
                  obtenerEstadisticasCaja(pedidos, filtroCaja).monto,
                ).toFixed(2)}
              </p>
              <small>
                {obtenerEstadisticasCaja(pedidos, filtroCaja).cantidad} pedidos
                realizados
              </small>
            </div>
          </div>

          <h3 className="subtitulo-tabla">📝 Detalle de Transacciones</h3>
          <div className="tabla-container-caja">
            <table className="tabla-admin-caja">
              <thead>
                <tr>
                  <th>FECHA</th>
                  <th>CLIENTE</th>
                  <th>TOTAL</th>
                  <th>RESEÑA</th>
                  <th>ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {obtenerEstadisticasCaja(pedidos, filtroCaja)
                  .filtrados.sort(
                    (a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0),
                  )
                  .map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.fecha?.toDate
                          ? p.fecha.toDate().toLocaleString("es-PE", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Sin fecha"}
                      </td>
                      <td>
                        {p.estado === "cancelado" ? (
                          <del>
                            <strong>
                              {p.cliente?.nombre || "Cte. Genérico"}
                            </strong>
                          </del>
                        ) : (
                          <strong>
                            {p.cliente?.nombre || "Cte. Genérico"}
                          </strong>
                        )}
                        <br />
                        <small className="texto-secundario">
                          {p.cliente?.tipo} {p.cliente?.referencia}
                        </small>
                      </td>
                      <td className="col-total-monto">
                        {p.estado === "cancelado" ? (
                          <span className="txt-cancelado">S/ 0.00</span>
                        ) : (
                          `S/ ${Number(p.total || 0).toFixed(2)}`
                        )}
                      </td>
                      <td className="col-resena">
                        {p.estado === "cancelado" ? (
                          <span className="badge-cancelado">❌ Cancelado</span>
                        ) : (
                          <div className="estrellas-display">
                            {"★".repeat(p.rating || 0)}
                            {"☆".repeat(5 - (p.rating || 0))}
                          </div>
                        )}
                        {p.resena && p.estado !== "cancelado" && (
                          <i className="comentario-mini">"{p.resena}"</i>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-ojito-detalleydatos"
                          onClick={() => setPedidoDetalle(p)}
                        >
                          👁️ Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* MODAL DETALLE para ver detalle del pedido terminado y cobrado*/}
          {pedidoDetalle && (
            <div
              className="modal-overlay-fijo"
              onClick={() => setPedidoDetalle(null)}
            >
              <div
                className="modal-detalle-centrado"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="modal-header">
                  <h3>Detalle del Pedido</h3>
                  <button
                    className="btn-cerrar-x"
                    onClick={() => setPedidoDetalle(null)}
                  >
                    &times;
                  </button>
                </header>

                <div className="modal-body">
                  <p>
                    <strong>Cliente:</strong> {pedidoDetalle.cliente?.nombre}
                  </p>
                  <p>
                    <strong>Referencia:</strong>{" "}
                    {pedidoDetalle.cliente?.referencia}
                  </p>
                  <hr />
                  <ul
                    className="lista-productos-modal"
                    style={{ listStyle: "none", padding: 0 }}
                  >
                    {pedidoDetalle.items?.map((item, index) => (
                      <li
                        key={index}
                        className="item-fila-modal"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span>
                          {item.cantidad}x {item.nombre}
                        </span>
                        <span>
                          S/{" "}
                          {Number(
                            item.subtotal || item.precio * item.cantidad,
                          ).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="modal-total-destacado">
                    <strong>TOTAL</strong>
                    <strong>
                      S/ {Number(pedidoDetalle.total || 0).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <footer className="modal-footer">
                  <button
                    className="btn-accion-primario"
                    onClick={() => setPedidoDetalle(null)}
                  >
                    Cerrar
                  </button>
                </footer>
              </div>
            </div>
          )}
        </div>
      )}
      {/* SECCIÓN USUARIOS */}
      {seccion === "usuarios" && (
        <div className="admin-section">
          <h2 className="titulo-seccion">👤 Gestión de Personal</h2>
          <form onSubmit={registrarAdmin} className="form-admin">
            <input
              className="input-pro"
              type="email"
              required
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Correo electrónico"
            />
            <input
              className="input-pro"
              type="password"
              required
              minLength={6}
              value={userPass}
              onChange={(e) => setUserPass(e.target.value)}
              placeholder="Contraseña (mín. 6 caracteres)"
            />
            <select
              className="input-pro"
              value={userRol}
              onChange={(e) => setUserRol(e.target.value)}
            >
              <option value="" disabled>
                Seleccionar Rol
              </option>
              <option value="mozo">Mozo (Solo Pedidos)</option>
              <option value="cajero">Cajero (Solo Caja)</option>
              <option value="admin">Administrador (Control Total)</option>
            </select>

            <button
              type="submit"
              disabled={cargando || userPass.length < 6 || !userRol}
              className="btn-primary"
              style={{
                width: "100%",
                marginTop: "10px",
                opacity: cargando || userPass.length < 6 ? 0.6 : 1,
                cursor:
                  cargando || userPass.length < 6 ? "not-allowed" : "pointer",
              }}
            >
              {cargando
                ? "Procesando..."
                : `Registrar Nuevo ${userRol.charAt(0).toUpperCase() + userRol.slice(1)}`}
            </button>
          </form>

          <div className="grid-admin" style={{ marginTop: "30px" }}>
            {usuarios.length === 0 ? (
              <p className="text-center">Cargando personal o lista vacía...</p>
            ) : (
              usuarios.map((u) => {
                // 🛡️ CONTROL ANTI-AUTODESTRUCCIÓN SEGURO CON FIREBASE AUTH
                const emailAutenticado = auth?.currentUser?.email || "";
                const esUsuarioActual =
                  u.email.toLowerCase().trim() ===
                  emailAutenticado.toLowerCase().trim();

                return (
                  <div
                    key={u.id}
                    className="card-admin"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "16px",
                    }}
                  >
                    <div style={{ flex: 1, marginRight: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "4px",
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: "600" }}>
                          <strong>Email:</strong> {u.email}
                        </p>
                        {esUsuarioActual && (
                          <span
                            style={{
                              fontSize: "10px",
                              background: "#e0f2fe",
                              color: "#0369a1",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: "700",
                            }}
                          >
                            TÚ
                          </span>
                        )}
                      </div>

                      <div style={{ marginBottom: "10px" }}>
                        <span className={`badge-rol ${u.rol}`}>{u.rol}</span>
                      </div>

                      {/* Bloque interno de datos de credenciales */}
                      <div
                        style={{
                          background: "#f8fafc",
                          padding: "10px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "4px",
                          }}
                        >
                          <span style={{ color: "#64748b" }}>
                            🔑 Clave Web:
                          </span>
                          <strong style={{ fontFamily: "monospace" }}>
                            {verPassword && verPassword[u.email]
                              ? u.password || "******"
                              : "••••••"}
                          </strong>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "4px",
                          }}
                        >
                          <span style={{ color: "#64748b" }}>
                            🔒 PIN Táctil:
                          </span>
                          <strong
                            style={{
                              fontFamily: "monospace",
                              color: "#4f46e5",
                            }}
                          >
                            {verPassword && verPassword[u.email]
                              ? u.pin || "••••"
                              : "••••"}
                          </strong>
                        </div>

                        {/* Tu botón con la clase CSS única */}
                        <button
                          type="button"
                          className="btn-ojito-detalleydatos"
                          onClick={() =>
                            setVerPassword((prev) => ({
                              ...prev,
                              [u.email]: !prev?.[u.email],
                            }))
                          }
                        >
                          <span>
                            {verPassword && verPassword[u.email]
                              ? "👁️ Ocultar datos"
                              : "👁️ Ver credenciales"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Tacho de eliminación protegido */}
                    <button
                      onClick={() =>
                        !esUsuarioActual && confirmarEliminarUser(u.email)
                      }
                      className="btn-delete-icon"
                      title={
                        esUsuarioActual
                          ? "No puedes eliminarte a ti mismo"
                          : "Eliminar usuario"
                      }
                      disabled={cargando || esUsuarioActual}
                      style={{
                        background: "none",
                        border: "none",
                        cursor:
                          cargando || esUsuarioActual
                            ? "not-allowed"
                            : "pointer",
                        opacity: esUsuarioActual ? 0.25 : 1,
                        padding: "4px",
                      }}
                    >
                      <Trash2
                        size={20}
                        color={
                          cargando || esUsuarioActual ? "#9ca3af" : "#ef4444"
                        }
                      />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
