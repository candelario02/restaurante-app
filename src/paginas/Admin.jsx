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
import { actualizarEstadoPedido } from "../servicios/pedidosServicio";
import {
  registrarUsuario,
  eliminarUsuario,
  escucharUsuarios,
} from "../servicios/usuariosServicio";
import { subirImagen } from "../servicios/cloudinaryServicio";

// 🔥 HOOKS
import { escucharProductosAdmin, escucharPedidos } from "../hooks/useProductos";

// 🔥 CONFIGURACIÓN
import { auth } from "../firebase/config";

const Admin = ({ seccion, setSeccion, restauranteId, rolUsuario }) => {
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState("Comidas");
  const [editandoId, setEditandoId] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [imgPreview, setImgPreview] = useState("");
  const [cargando, setCargando] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPass, setUserPass] = useState("");
  const [userRol, setUserRol] = useState("mozo");
  const [filtroCaja, setFiltroCaja] = useState("dia");
  const [busqueda, setBusqueda] = useState("");
  const [pedidoDetalle, setPedidoDetalle] = useState(null);

  const fileInputRef = useRef(null);

  // cargar datos de bd
  useEffect(() => {
    if (!restauranteId || !rolUsuario) return;

    const isAdmin = rolUsuario === "admin" || rolUsuario === "superadmin";
    console.log(
      `[Firebase] Conectando a: ${restauranteId} (Admin: ${isAdmin})`,
    );

    let unsubProd = () => {};
    let unsubPed = () => {};
    let unsubUser = () => {};

    try {
      // 1. PRODUCTOS
      if (isAdmin) {
        unsubProd = escucharProductosAdmin(restauranteId, setProductos);
      } else {
        unsubProd = obtenerProductos(restauranteId, categoria, setProductos);
      }

      // 2. PEDIDOS
      unsubPed = escucharPedidos(restauranteId, setPedidos);

      // 3. USUARIOS (Admin)
      if (isAdmin) {
        unsubUser = escucharUsuarios(restauranteId, setUsuarios);
      }
    } catch (error) {
      console.error("Error al suscribirse a Firebase:", error);
    }

    return () => {
      unsubProd();
      unsubPed();
      unsubUser();
    };
  }, [restauranteId, rolUsuario, categoria]);
  //PRODUCTOS
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

      if (archivo) {
        urlFinal = await subirImagen(archivo);
      }

      const datos = {
        nombre: nombre.trim(),
        precio: Number(precio),
        categoria,
        imagenUrl: urlFinal || "",
      };

      if (editandoId) {
        await actualizarProducto(editandoId, datos, restauranteId);
        // Alerta de éxito para actualización
        Swal.fire({
          icon: "success",
          title: "¡Actualizado!",
          text: "El producto se actualizó correctamente.",
          showConfirmButton: false,
          timer: 2000,
          position: "center",
        });
      } else {
        await crearProducto(datos, restauranteId);
        // Alerta de éxito para creación
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

  const cancelarEdicion = () => {
    setEditandoId(null);
    setNombre("");
    setPrecio("");
    setCategoria("Comidas");
    setArchivo(null);
    setImgPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  //buscador
  const productosFiltrados = React.useMemo(() => {
    return productos.filter((p) =>
      (p.nombre || "").toLowerCase().includes(busqueda.toLowerCase()),
    );
  }, [productos, busqueda]);
  //edicion
  const prepararEdicion = (p) => {
    setEditandoId(p.id);
    setNombre(p.nombre);
    setPrecio(p.precio);
    setCategoria(p.categoria);
    setImgPreview(p.imagenUrl);
  };

  const manejarEliminar = (id) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "Este plato se eliminará permanentemente del menú.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await eliminarProducto(id, restauranteId);
          Swal.fire({
            title: "Eliminado",
            text: "El producto ha sido borrado.",
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

    if (!restauranteId) {
      return Swal.fire({
        icon: "error",
        title: "Error de contexto",
        text: "No se detectó el ID del restaurante.",
      });
    }

    if (cargando) return;

    try {
      setCargando(true);

      await registrarUsuario(userEmail, userPass, userRol, restauranteId);

      // 3. Éxito
      Swal.fire({
        icon: "success",
        title: "¡Registro Exitoso!",
        text: `Se ha creado el perfil de ${userRol.toUpperCase()} para ${userEmail}.`,
        confirmButtonColor: "#6366f1",
        timer: 2000,
      });

      setUserEmail("");
      setUserPass("");
      setUserRol("mozo");
    } catch (error) {
      let mensajeError = error.message;
      if (error.code === "auth/email-already-in-use") {
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
  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      await actualizarEstadoPedido(restauranteId, id, nuevoEstado);

      Swal.fire({
        icon: "success",
        title: "Estado Actualizado",
        text: `Orden en etapa: ${nuevoEstado.toUpperCase()}`,
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo cambiar el estado", "error");
    }
  };
  //funcion de caja
  const obtenerEstadisticasCaja = (listaPedidos, periodo) => {
    const ahora = new Date();
    const filtrados = listaPedidos.filter((p) => {
      if (p.estado !== "entregado" || !p.fecha?.toDate) return false;
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
        return fechaP.getFullYear() === ahora.getFullYear();
      return true;
    });

    const monto = filtrados
      .reduce((acc, p) => acc + Number(p.total), 0)
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

      Swal.fire({
        title: estadoActual ? "Plato Activado" : "Plato Agotado",
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
          <h2 className="titulo-seccion">
            {editandoId ? "Editar Producto" : "Nuevo Plato"}
          </h2>

          <form onSubmit={guardarProducto} className="form-admin-pro">
            <input
              className="input-pro"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del plato"
            />
            <input
              className="input-pro"
              type="number"
              required
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="Precio (S/)"
            />
            <select
              className="select-pro"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="Comidas">Comidas</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Entradas">Entradas</option>
              <option value="Cafeteria">Cafeteria</option>
            </select>

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
                {imgPreview ? " Imagen Cargada" : " Subir Imagen"}
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
                className="btn-guardar-pro-ajustado"
                disabled={!restauranteId || cargando}
                style={{ opacity: cargando ? 0.7 : 1 }}
              >
                {cargando ? (
                  "Procesando..."
                ) : (
                  <>
                    <Save size={18} />
                    {editandoId ? " Actualizar" : " Guardar"}
                  </>
                )}
              </button>

              <div className="buscador-container-pro">
                <Search size={18} className="icon-search" />
                <input
                  type="text"
                  placeholder="Buscar plato..."
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
                  title="Cancelar edición"
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
                  <th>PRECIO</th>
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
                    <td className="acciones-pro">
                      <button
                        className="btn-edit"
                        onClick={() => prepararEdicion(p)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => manejarEliminar(p.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECCIÓN PEDIDOS*/}
      {seccion === "pedidos" && (
        <div className="admin-section">
          <h2 className="titulo-seccion">📦 Pedidos pendientes </h2>

          {pedidos.filter((p) => p.estado !== "entregado").length === 0 ? (
            <div className="no-data">
              Todo en orden. No hay pedidos recientes.
            </div>
          ) : (
            <div className="grid-admin">
              {pedidos
                .filter((p) => p.estado !== "entregado")
                .sort(
                  (a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0),
                )
                .map((p) => (
                  <div key={p.id} className="card-admin">
                    <div className="card-header">
                      <div>
                        <strong>{p.cliente?.nombre || "Cliente"}</strong>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "#666",
                            margin: "4px 0",
                          }}
                        >
                          {p.cliente?.tipo === "Mesa"
                            ? `📍 Mesa: ${p.cliente?.referencia}`
                            : `🛵 Delivery: ${p.cliente?.referencia}`}
                        </p>
                        {p.cliente?.telefono && (
                          <p style={{ fontSize: "0.8rem", color: "#007bff" }}>
                            📞 {p.cliente.telefono}
                          </p>
                        )}
                      </div>
                      <span className={`status-badge ${p.estado}`}>
                        {(p.estado || "pendiente").toUpperCase()}
                      </span>
                    </div>

                    <div className="items-pedido">
                      {p.items?.map((item, index) => (
                        <p key={index} className="item-fila">
                          <span className="cantidad">{item.cantidad}x</span>
                          <span className="nombre">{item.nombre}</span>
                        </p>
                      ))}
                      <hr />
                      <p className="total-pedido">
                        <strong>
                          Total: S/ {Number(p.total || 0).toFixed(2)}
                        </strong>
                      </p>
                    </div>

                    <div className="acciones-pedido">
                      {p.estado === "pendiente" && (
                        <button
                          className="btn-primary"
                          disabled={cargando}
                          onClick={() => cambiarEstado(p.id, "cocinando")}
                        >
                          👨‍🍳 Preparar
                        </button>
                      )}

                      {p.estado === "cocinando" && (
                        <button
                          className="btn-success"
                          disabled={cargando}
                          onClick={() => cambiarEstado(p.id, "entregado")}
                        >
                          ✅ Finalizar y Cobrar
                        </button>
                      )}

                      {p.estado === "cocinando" && (
                        <button
                          className="btn-revertir"
                          disabled={cargando}
                          style={{ marginLeft: "8px" }}
                          onClick={() => cambiarEstado(p.id, "pendiente")}
                        >
                          ↩️ Revertir
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
          <div className="tabla-container-pro">
            <table className="tabla-admin-pro">
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
                        <strong>{p.cliente?.nombre || "Cte. Genérico"}</strong>
                        <br />
                        <small className="texto-secundario">
                          {p.cliente?.tipo} {p.cliente?.referencia}
                        </small>
                      </td>
                      <td className="col-total-monto">
                        S/ {Number(p.total || 0).toFixed(2)}
                      </td>
                      <td className="col-resena">
                        <div className="estrellas-display">
                          {"★".repeat(p.rating || 0)}
                          {"☆".repeat(5 - (p.rating || 0))}
                        </div>
                        {p.comentario && (
                          <i className="comentario-mini">"{p.comentario}"</i>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-ojito-detalle"
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

          {/* MODAL DETALLE */}
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
              <option value="mozo">Mozo (Solo Pedidos)</option>
              <option value="cajero">Cajero (Pedidos y Pagos)</option>
              <option value="admin">Administrador (Control Total)</option>
            </select>

            <button
              type="submit"
              disabled={cargando || userPass.length < 6}
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
              usuarios.map((u) => (
                <div
                  key={u.id}
                  className="card-admin"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p style={{ margin: 0 }}>
                      <strong>Email:</strong> {u.email}
                    </p>
                    <span className={`badge-rol ${u.rol}`}>{u.rol}</span>
                  </div>

                  <button
                    onClick={() => confirmarEliminarUser(u.email)}
                    className="btn-delete-icon"
                    title="Eliminar usuario"
                    disabled={cargando}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: cargando ? "not-allowed" : "pointer",
                    }}
                  >
                    <Trash2
                      size={20}
                      color={cargando ? "#9ca3af" : "#ef4444"}
                    />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
