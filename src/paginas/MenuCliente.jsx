import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import "../estilos/menuCliente.css";

import {
  obtenerProductos,
  obtenerConfigRestaurante,
} from "../servicios/productosServicio";

import { crearPedido } from "../servicios/pedidosServicio";

import {
  Utensils,
  Coffee,
  Pizza,
  Droplet,
  ArrowLeft,
  ShoppingCart,
  User,
  Phone,
  MapPin,
  Plus,
  CheckCircle,
  Clock,
  ChefHat,
  Truck,
} from "lucide-react";

const MenuCliente = ({ restauranteId = "jekito_restobar" }) => {
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [avisoAgregado, setAvisoAgregado] = useState(null);
  const [logoRestaurante, setLogoRestaurante] = useState(
    "/logo_resturante.gif",
  );

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [tipoPedido, setTipoPedido] = useState("mesa");
  const [enviando, setEnviando] = useState(false);

  const [pedidoActivoId, setPedidoActivoId] = useState(
    localStorage.getItem(`ultimoPedido_${restauranteId}`),
  );
  const [datosPedidoRealtime, setDatosPedidoRealtime] = useState(null);

  // 🔥 Config restaurante
  useEffect(() => {
    const cargarConfig = async () => {
      const config = await obtenerConfigRestaurante(restauranteId);
      if (config?.logoUrl) {
        setLogoRestaurante(config.logoUrl);
      }
    };
    cargarConfig();
  }, [restauranteId]);

  // 🔥 Productos
  useEffect(() => {
    if (!categoriaActual) return;

    const unsub = obtenerProductos(
      restauranteId,
      categoriaActual,
      setProductos,
    );

    return () => unsub();
  }, [categoriaActual, restauranteId]);

  // 🔥 Seguimiento pedido
  useEffect(() => {
    if (!pedidoActivoId) return;

    const unsub = onSnapshot(
      doc(db, "restaurantes", restauranteId, "pedidos", pedidoActivoId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDatosPedidoRealtime(data);

          if (data.estado === "entregado") {
            setTimeout(() => {
              setPedidoActivoId(null);
              localStorage.removeItem(`ultimoPedido_${restauranteId}`);
              setDatosPedidoRealtime(null);
            }, 15000);
          }
        }
      },
    );

    return () => unsub();
  }, [pedidoActivoId, restauranteId]);

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => [...prev, producto]);
    setAvisoAgregado(producto.nombre);
    setTimeout(() => setAvisoAgregado(null), 1500);
  };

  const total = carrito.reduce(
    (acc, item) => acc + Number(item.precio || 0),
    0,
  );

  const enviarPedido = async () => {
    if (tipoPedido === "mesa" && !nombre) return alert("Ingresa tu nombre");
    if (tipoPedido === "delivery" && (!nombre || !telefono || !direccion)) {
      return alert("Completa los datos");
    }

    setEnviando(true);

    try {
      const nuevoPedido = {
        restauranteId,
        cliente: {
          nombre,
          telefono: tipoPedido === "mesa" ? "Local" : telefono,
          direccion: tipoPedido === "mesa" ? "Local" : direccion,
          tipo: tipoPedido,
        },
        productos: carrito.map((p) => ({
          nombre: p.nombre,
          precio: p.precio,
        })),
        total,
        estado: "pendiente",
        fecha: new Date(),
      };

      const id = await crearPedido(restauranteId, nuevoPedido);

      setPedidoActivoId(id);
      localStorage.setItem(`ultimoPedido_${restauranteId}`, id);

      setCarrito([]);
      setMostrarFormulario(false);
      setVerCarrito(false);
    } catch (error) {
      alert("Error al enviar pedido");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="admin-container">
      {/* ✅ TOAST */}
      {avisoAgregado && (
        <div className="toast-agregado">
          <CheckCircle size={18} /> {avisoAgregado} agregado
        </div>
      )}

      {/* ✅ BOTÓN CARRITO */}
      {carrito.length > 0 &&
        !verCarrito &&
        !mostrarFormulario &&
        !pedidoActivoId && (
          <button
            className="btn-carrito-flotante"
            onClick={() => setVerCarrito(true)}
          >
            <ShoppingCart size={20} />
            <span>Ver Mi Orden (S/ {total.toFixed(2)})</span>
          </button>
        )}

      {/* ✅ SEGUIMIENTO */}
      {pedidoActivoId && datosPedidoRealtime && (
        <div className="view-principal">
          <h2>Estado: {datosPedidoRealtime.estado}</h2>
        </div>
      )}

      {/* ✅ CATEGORÍAS */}
      {!pedidoActivoId && !categoriaActual && (
        <div className="view-principal">
          <img
            src={logoRestaurante}
            alt="logo"
            style={{ width: 80, borderRadius: "50%" }}
          />
          <h2>¿Qué deseas?</h2>

          <div className="categorias-grid-principal">
            <div onClick={() => setCategoriaActual("Menu")}>
              <Pizza size={60} className="icon-comidas" />
              <p>Comidas</p>
            </div>

            <div onClick={() => setCategoriaActual("Cafeteria")}>
              <Coffee size={60} className="icon-cafeteria" />
              <p>Cafetería</p>
            </div>

            <div onClick={() => setCategoriaActual("Bebidas")}>
              <Droplet size={60} className="icon-bebidas" />
              <p>Bebidas</p>
            </div>

            <div onClick={() => setCategoriaActual("Entradas")}>
              <Utensils size={60} className="icon-entradas" />
              <p>Entradas</p>
            </div>
          </div>
        </div>
      )}

      {categoriaActual && (
        <>
          <button onClick={() => setCategoriaActual(null)}>
            <ArrowLeft /> Volver
          </button>
          <div className="productos-grid">
            {productos.map((p) => (
              <div key={p.id} className="producto-card">
                <img src={p.img} alt={p.nombre} />
                <h3>{p.nombre}</h3>
                <p>S/ {Number(p.precio).toFixed(2)}</p>

                <button
                  className="btn-agregar"
                  onClick={() => agregarAlCarrito(p)}
                >
                  <Plus size={20} />
                  <span>Agregar</span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ✅ CARRITO */}
      {verCarrito && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2>Tu Orden</h2>

            {carrito.map((item, i) => (
              <div key={i}>
                {item.nombre} - S/ {item.precio}
              </div>
            ))}

            <h3>Total: S/ {total.toFixed(2)}</h3>

            <button onClick={() => setVerCarrito(false)}>Seguir</button>
            <button
              onClick={() => {
                setVerCarrito(false);
                setMostrarFormulario(true);
              }}
            >
              Pedir
            </button>
          </div>
        </div>
      )}

      {/* ✅ FORMULARIO */}
      {mostrarFormulario && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2>Datos</h2>

            <input
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />

            {tipoPedido === "delivery" && (
              <>
                <input
                  placeholder="Teléfono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
                <input
                  placeholder="Dirección"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </>
            )}

            <button onClick={enviarPedido} disabled={enviando}>
              {enviando ? "Enviando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCliente;
