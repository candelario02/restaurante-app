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
          <h2 className="titulo-principal">🍽 Gestión de Productos</h2>

          <form onSubmit={guardarProducto} className="form-admin">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del producto"
            />
            <input
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="Precio"
            />
            <button className="btn-primary">
              {editandoId ? "Actualizar" : "Guardar"}
            </button>
          </form>

          <div className="grid-admin">
            {productos.map((p) => (
              <div key={p.id} className="card-admin">
                <h3>{p.nombre}</h3>
                <p>S/ {p.precio}</p>

                <div className="acciones">
                  <button onClick={() => prepararEdicion(p)}>
                    <Edit size={16} />
                  </button>

                  <button onClick={() => eliminarProducto(p.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
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
