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

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!restauranteId || !rolUsuario) {
      console.log("Esperando datos de perfil para iniciar el listado");
      return;
    }

    console.log("Iniciando listado para:", restauranteId);

    const unsubProd = escucharProductos(restauranteId, (data) => {
      setProductos(data);
    });

    const unsubPed = escucharPedidos(restauranteId, (data) => {
      setPedidos(data);
    });

    let unsubUser = () => {};
    if (rolUsuario === "admin") {
      unsubUser = escucharUsuarios(restauranteId, (data) => {
        setUsuarios(data);
      });
    }

    return () => {
      unsubProd();
      unsubPed();
      unsubUser();
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

    if (rolUsuario === "mozo") return alert("No tienes permisos");
    if (!nombre.trim() || !precio) return alert("Completa nombre y precio");
    if (!restauranteId) return alert("Error: ID de restaurante no detectado");
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
        alert("✅ Producto actualizado");
      } else {
        await crearProducto(datos, restauranteId);
        alert("✅ Producto creado");
      }

      setNombre("");
      setPrecio("");
      setArchivo(null);
      setImgPreview("");
      setEditandoId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      alert("❌ Error: " + error.message);
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

  const manejarClickImagen = () => {
    fileInputRef.current.click();
  };
  // 👤 USUARIOS
  const registrarAdmin = async (e) => {
    e.preventDefault();
    try {
      await registrarUsuario(userEmail, userPass, "mozo", restauranteId);
      alert("Usuario creado");
      setUserEmail("");
      setUserPass("");
    } catch {
      alert("Error al registrar");
    }
  };
  // 📦 PEDIDOS
  const cambiarEstado = async (id, estado) => {
    await actualizarEstadoPedido(id, estado);
    alert("Estado actualizado");
  };

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
            <button
              className="btn-guardar-pro"
              disabled={!restauranteId || cargando}
            >
              {cargando ? (
                "Guardando..."
              ) : (
                <>
                  <Save size={18} /> Guardar Producto
                </>
              )}
            </button>
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
                          cambiarDisponibilidad(p.id, !p.disponible)
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
                        onClick={() => {
                          if (
                            window.confirm(
                              "¿Seguro que quieres borrar este plato?",
                            )
                          ) {
                            eliminarProducto(p.id);
                          }
                        }}
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
          <h2 className="titulo-seccion">👤 Usuarios</h2>
          <form onSubmit={registrarAdmin} className="form-admin">
            <input
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Correo"
            />
            <input
              type="password"
              value={userPass}
              onChange={(e) => setUserPass(e.target.value)}
              placeholder="Contraseña"
            />
            <button className="btn-primary">Crear</button>
          </form>
          <div className="grid-admin">
            {usuarios.map((u) => (
              <div key={u.id} className="card-admin">
                <p>{u.email}</p>
                <span>{u.rol}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
