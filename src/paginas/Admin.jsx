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

const Admin = ({ seccion, setSeccion, restauranteId, rolUsuario }) => {
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState("Comidas");
  const [editandoId, setEditandoId] = useState(null);

  const [userEmail, setUserEmail] = useState("");
  const [userPass, setUserPass] = useState("");

  const fileInputRef = useRef(null);

  // 🔥 TIEMPO REAL
  useEffect(() => {
    if (!restauranteId) return;

    const unsubProd = escucharProductos(restauranteId, setProductos);
    const unsubPed = escucharPedidos(restauranteId, setPedidos);

    let unsubUser = () => {};
    if (rolUsuario !== "mozo") {
      unsubUser = escucharUsuarios(restauranteId, setUsuarios);
    }

    return () => {
      unsubProd();
      unsubPed();
      unsubUser();
    };
  }, [restauranteId, rolUsuario]);
  // 🧾 PRODUCTOS
  const guardarProducto = async (e) => {
    e.preventDefault();
    if (rolUsuario === "mozo") return alert("No tienes permisos");

    try {
      const datos = { nombre, precio: Number(precio), categoria };

      if (editandoId) {
        await actualizarProducto(editandoId, { ...datos, restauranteId });
        alert("Producto actualizado");
      } else {
        await crearProducto(datos, restauranteId);
        alert("Producto creado");
      }
      cancelarEdicion();
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setNombre("");
    setPrecio("");
  };

  const prepararEdicion = (p) => {
    setEditandoId(p.id);
    setNombre(p.nombre);
    setPrecio(p.precio);
    setCategoria(p.categoria);
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
      <div className="admin-header-main">
        <h2 className="titulo-principal">Panel Administrativo</h2>

        <div className="admin-nav-tabs">
          <button
            className={`tab-btn ${seccion === "menu" ? "active" : ""}`}
            onClick={() => setSeccion("menu")}
          >
            <Utensils size={20} /> Menú
          </button>
          <button
            className={`tab-btn ${seccion === "usuarios" ? "active" : ""}`}
            onClick={() => setSeccion("usuarios")}
          >
            <Users size={20} /> Usuarios
          </button>
          <button
            className={`tab-btn ${seccion === "pedidos" ? "active" : ""}`}
            onClick={() => setSeccion("pedidos")}
          >
            <Package size={20} /> Pedidos
          </button>
        </div>
      </div>
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
              <option value="Postres">Postres</option>
              <option value="Cafeteria">Cafeteria</option>
            </select>

            <div className="upload-box">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
              />
              <button
                type="button"
                className="btn-upload-pro"
                onClick={manejarClickImagen}
              >
                <ImageIcon size={18} /> Subir Imagen
              </button>
            </div>

            <button className="btn-guardar-pro">
              <Save size={18} /> Guardar Producto
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
                      <img src={p.imagenUrl} alt="" className="img-mini-pro" />
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
