import React, { useState, useEffect } from "react";
import { Trash2, Edit } from "lucide-react";
import "../estilos/admin.css";

// 🔥 SERVICIOS
import {
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from "../servicios/productosServicio";

import { actualizarEstadoPedido } from "../servicios/pedidosServicio";

import { registrarUsuario } from "../servicios/usuariosServicio";

// 🔥 HOOKS TIEMPO REAL
import {
  escucharProductos,
  escucharUsuarios,
  escucharPedidos,
} from "../hooks/useProductos";

const Admin = ({ seccion, restauranteId, rolUsuario }) => {
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState("Menu");
  const [editandoId, setEditandoId] = useState(null);

  const [userEmail, setUserEmail] = useState("");
  const [userPass, setUserPass] = useState("");

  // 🔥 TIEMPO REAL
  useEffect(() => {
    if (!restauranteId) return;

    const unsubProd = escucharProductos(restauranteId, setProductos);
    const unsubUser = escucharUsuarios(restauranteId, setUsuarios);
    const unsubPed = escucharPedidos(restauranteId, setPedidos);

    return () => {
      unsubProd();
      unsubUser();
      unsubPed();
    };
  }, [restauranteId]);

  // =============================
  // 🧾 PRODUCTOS
  // =============================
  const guardarProducto = async (e) => {
    e.preventDefault();

    if (rolUsuario === "mozo") {
      return alert("No tienes permisos");
    }

    try {
      if (editandoId) {
        await actualizarProducto(editandoId, {
          nombre,
          precio,
          categoria,
          restauranteId,
        });
        alert("Producto actualizado");
      } else {
        await crearProducto({
          nombre,
          precio,
          categoria,
          restauranteId,
          disponible: true,
        });
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

  // =============================
  // 👤 USUARIOS
  // =============================
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

  // =============================
  // 📦 PEDIDOS
  // =============================
  const cambiarEstado = async (id, estado) => {
    await actualizarEstadoPedido(restauranteId, id, estado);
    alert("Estado actualizado");
  };

  return (
    <div className="admin-container">
      {/* ================= MENU ================= */}
      {seccion === "menu" && (
        <div className="admin-section">
          {/* 📋 NAVEGACIÓN INTERNA */}
          <div className="admin-nav-tabs">
            <button className="tab-btn active">
              <Utensils size={20} /> Menú
            </button>
            <button className="tab-btn">
              <Users size={20} /> Usuarios
            </button>
            <button className="tab-btn">
              <Package size={20} /> Pedidos
            </button>
          </div>

          <h2 className="titulo-principal">Nuevo Plato</h2>

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
            </select>

            <div className="upload-box">
              <button type="button" className="btn-upload-pro">
                <Image size={18} /> Subir Imagen
              </button>
            </div>

            <button className="btn-guardar-pro">
              <Save size={18} /> Guardar Producto
            </button>
          </form>

          {/* 📊 TABLA PROFESIONAL (Recuperada de tu imagen) */}
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
                        onClick={() => eliminarProducto(p.id)}
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

      {/* ================= PEDIDOS ================= */}
      {seccion === "pedidos" && (
        <div className="admin-section">
          <h2 className="titulo-principal">📦 Pedidos</h2>

          <div className="grid-admin">
            {" "}
            {pedidos.map((p) => (
              <div key={p.id} className="card-admin">
                <strong>{p.cliente?.nombre}</strong>
                <span className={`status-badge ${p.estado}`}>{p.estado}</span>

                <button
                  className="btn-success"
                  onClick={() => cambiarEstado(p.id, "entregado")}
                >
                  Entregar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= USUARIOS ================= */}
      {seccion === "usuarios" && (
        <div className="admin-section">
          <h2 className="titulo-principal">👤 Usuarios</h2>

          <form onSubmit={registrarAdmin} className="form-admin">
            <input
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Correo"
            />
            <input
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
