import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import "../estilos/admin.css";
import Swal from "sweetalert2";
// 🔥 SERVICIOS
import {
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  cambiarDisponibilidad,
} from "../servicios/productosServicio";
import { actualizarEstadoPedido } from "../servicios/pedidosServicio";
import { registrarUsuario } from "../servicios/usuariosServicio";

// 🔥 HOOKS TIEMPO REAL
import {
  escucharProductos,
  escucharUsuarios,
  escucharPedidos,
} from "../hooks/useProductos";
import { subirImagen } from "../servicios/cloudinaryServicio";
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

  const fileInputRef = useRef(null);

  // cargar datos de bd
  useEffect(() => {
    if (!restauranteId || !rolUsuario || !auth.currentUser) {
      return;
    }

    console.log(
      `[Firebase] Conectando a: ${restauranteId} con rol: ${rolUsuario}`,
    );

    let unsubProd = () => {};
    let unsubPed = () => {};
    let unsubUser = () => {};

    try {
      unsubProd = escucharProductos(restauranteId, (data) => {
        setProductos(data);
      });

      unsubPed = escucharPedidos(restauranteId, (data) => {
        setPedidos(data);
      });

      if (rolUsuario === "admin" || rolUsuario === "superadmin") {
        unsubUser = escucharUsuarios(restauranteId, (data) => {
          setUsuarios(data);
        });
      }
    } catch (error) {
      console.error("Error en suscripciones de Firebase:", error);
    }

    return () => {
      unsubProd();
      unsubPed();
      unsubUser();
      console.log("[Firebase] Suscripciones cerradas.");
    };
  }, [restauranteId, rolUsuario]);
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
  };
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
          await eliminarProducto(id);
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
      return Swal.fire({ icon: "warning", title: "Campos vacíos" });
    }

    try {
      await registrarUsuario(userEmail, userPass, userRol, restauranteId);

      Swal.fire({
        icon: "success",
        title: "¡Registro Exitoso!",
        text: `Se ha creado el perfil de ${userRol} para ${userEmail}.`,
        confirmButtonColor: "#6366f1",
      });

      setUserEmail("");
      setUserPass("");
      setUserRol("mozo");
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: error.message });
    }
  };
  // 📦 PEDIDOS
  const cambiarEstado = async (id, estado) => {
    try {
      await actualizarEstadoPedido(id, estado);
      Swal.fire({
        icon: "success",
        title: "Pedido Actualizado",
        text: `El pedido ahora está como: ${estado}`,
        timer: 1500,
        showConfirmButton: false,
        position: "center",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo actualizar el estado: " + error.message,
      });
    }
  };
  //DISPONIBILIDAD
  const manejarDisponibilidad = async (id, estadoActual, restauranteId) => {
    try {
      await cambiarDisponibilidad(id, estadoActual, restauranteId);

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
          <h2 className="titulo-seccion">Nuevo Plato</h2>

          <form onSubmit={guardarProducto} className="form-admin-pro">
            <input
              className="input-pro"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del plato"
            />
            <input
              className="input-pro"
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

            <div className="admin-botones-container">
              <button
                type="submit"
                className="btn-guardar-pro"
                disabled={!restauranteId || cargando}
              >
                {cargando ? (
                  "Procesando..."
                ) : (
                  <>
                    <Save size={18} />
                    {editandoId ? " Actualizar Producto" : " Guardar Producto"}
                  </>
                )}
              </button>

              {editandoId && (
                <button
                  type="button"
                  className="btn-cancelar-pro"
                  onClick={cancelarEdicion}
                >
                  Cancelar
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
                {productos.map((p) => (
                  <tr key={p.id}>
                    <td className="td-plato">
                      <img
                        src={p.imagenUrl || "https://via.placeholder.com/50"}
                        alt={p.nombre}
                        className="img-mini-pro"
                      />
                      <span>{p.nombre}</span>
                    </td>
                    <td className="td-precio">S/ {p.precio}</td>
                    <td>
                      <button
                        className="btn-status-pro"
                        onClick={() =>
                          manejarDisponibilidad(
                            p.id,
                            !p.disponible,
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

      {/* SECCIÓN PEDIDOS */}
      {seccion === "pedidos" && (
        <div className="admin-section">
          <h2 className="titulo-seccion">📦 Pedidos</h2>
          <div className="grid-admin">
            {pedidos.map((p) => (
              <div key={p.id} className="card-admin">
                <div className="card-header">
                  <strong>{p.cliente?.nombre || "Cliente"}</strong>
                  <span className={`status-badge ${p.estado}`}>{p.estado}</span>
                </div>
                <div className="items-pedido">
                  {p.items?.map((item, index) => (
                    <p key={index}>
                      {item.cantidad}x {item.nombre}
                    </p>
                  ))}
                </div>
                <button
                  className="btn-success"
                  onClick={() => cambiarEstado(p.id, "entregado")}
                >
                  Marcar como Entregado
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN USUARIOS */}
      {seccion === "usuarios" && (
        <div className="admin-section">
          <h2 className="titulo-seccion">👤 Gestión de Personal</h2>
          <form onSubmit={registrarAdmin} className="form-admin">
            <input
              className="input-pro"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Correo electrónico"
            />
            <input
              className="input-pro"
              type="password"
              value={userPass}
              onChange={(e) => setUserPass(e.target.value)}
              placeholder="Contraseña"
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
              className="btn-primary"
              style={{ width: "100%", marginTop: "10px" }}
            >
              Registrar Nuevo{" "}
              {userRol.charAt(0).toUpperCase() + userRol.slice(1)}
            </button>
          </form>

          <div className="grid-admin">
            {usuarios.map((u) => (
              <div key={u.id} className="card-admin">
                <p>
                  <strong>Email:</strong> {u.email}
                </p>
                <span className={`badge-rol ${u.rol}`}>{u.rol}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
