import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import {
  Utensils,
  Coffee,
  Pizza,
  Droplet,
  ArrowLeft,
  ShoppingCart,
  User,
  Phone,
  MapPin
} from 'lucide-react';

const MenuCliente = () => {
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Datos del cliente
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!categoriaActual) return;

    const q = query(
      collection(db, "productos"),
      where("categoria", "==", categoriaActual),
      where("disponible", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProductos(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    });

    return () => unsubscribe();
  }, [categoriaActual]);

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => [...prev, producto]);
  };

  const total = carrito.reduce((acc, item) => acc + item.precio, 0);

  const enviarPedido = async () => {
    if (!nombre || !telefono || !direccion) {
      alert("Completa todos los datos");
      return;
    }
    setEnviando(true);
    try {
      await addDoc(collection(db, "pedidos"), {
        cliente: { nombre, telefono, direccion },
        productos: carrito,
        total,
        estado: "pendiente",
        fecha: new Date()
      });
      alert("Pedido enviado correctamente");
      setCarrito([]);
      setNombre('');
      setTelefono('');
      setDireccion('');
      setMostrarFormulario(false);
      setVerCarrito(false);
      setCategoriaActual(null);
    } catch (error) {
      console.error(error);
      alert("Error al enviar pedido");
    } finally {
      setEnviando(false);
    }
  };

  /* --- VISTA DE CATEGORÍAS --- */
  if (!categoriaActual) {
    return (
      /* Se añade la clase view-principal para quitar el padding superior del admin-container */
      <div className="admin-container view-principal">
        <div className="menu-principal-wrapper">
          
          <div className="header-brand">
            <h1 className="titulo-principal">Nuestro Menú</h1>
            <p className="subtitulo-principal">Selecciona una categoría</p>
          </div>

          <div className="categorias-grid-principal">
            
            <div className="categoria-item" onClick={() => setCategoriaActual('Menu')}>
              <div className="categoria-circulo bg-comidas">
                <Pizza size={90} className="icon-main" />
              </div>
              <span className="categoria-label">Comidas</span>
            </div>

            <div className="categoria-item" onClick={() => setCategoriaActual('Cafeteria')}>
              <div className="categoria-circulo bg-cafe">
                <Coffee size={90} className="icon-main" />
              </div>
              <span className="categoria-label">Café</span>
            </div>

            <div className="categoria-item" onClick={() => setCategoriaActual('Bebidas')}>
              <div className="categoria-circulo bg-bebidas">
                <Droplet size={90} className="icon-main" />
              </div>
              <span className="categoria-label">Bebidas</span>
            </div>

            <div className="categoria-item" onClick={() => setCategoriaActual('Entradas')}>
              <div className="categoria-circulo bg-entradas">
                <Utensils size={90} className="icon-main" />
              </div>
              <span className="categoria-label">Entradas</span>
            </div>

          </div>
        </div>

        {carrito.length > 0 && (
          <button className="btn-carrito-flotante" onClick={() => setVerCarrito(true)}>
            <ShoppingCart size={22} />
            <span>Mi pedido (S/ {total.toFixed(2)})</span>
          </button>
        )}
      </div>
    );
  }

  /* --- VISTA DE PRODUCTOS --- */
  return (
    <div className="admin-container">
      <div className="productos-wrapper">
        <div className="view-header">
          <button className="btn-back-inline" onClick={() => setCategoriaActual(null)}>
            <ArrowLeft size={24} />
          </button>
          <h2>{categoriaActual}</h2>
        </div>

        <div className="productos-grid">
          {productos.map(p => (
            <div key={p.id} className="producto-card">
              <div className="card-img-container">
                <img src={p.img} alt={p.nombre} />
              </div>
              <div className="card-body">
                <h3>{p.nombre}</h3>
                <div className="card-footer">
                  <span className="precio-text">S/ {p.precio.toFixed(2)}</span>
                  <button className="btn-add-cart" onClick={() => agregarAlCarrito(p)}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODALES */}
      {verCarrito && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2>Tu Pedido</h2>
            <div className="carrito-lista">
              {carrito.map((item, i) => (
                <div key={i} className="carrito-item-row">
                  <span>{item.nombre}</span>
                  <strong>S/ {item.precio.toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <h3 className="total-msg">Total: S/ {total.toFixed(2)}</h3>
            <div className="modal-buttons">
              <button className="btn-no" onClick={() => setVerCarrito(false)}>Atrás</button>
              <button className="btn-yes" onClick={() => setMostrarFormulario(true)}>Pedir ahora</button>
            </div>
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2>Datos de entrega</h2>
            <div className="login-form">
              <div className="input-group">
                <User className="input-icon" size={18} />
                <input placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div className="input-group">
                <Phone className="input-icon" size={18} />
                <input placeholder="WhatsApp" value={telefono} onChange={e => setTelefono(e.target.value)} />
              </div>
              <div className="input-group">
                <MapPin className="input-icon" size={18} />
                <input placeholder="Dirección completa" value={direccion} onChange={e => setDireccion(e.target.value)} />
              </div>
              <div className="modal-buttons">
                <button className="btn-no" onClick={() => setMostrarFormulario(false)}>Atrás</button>
                <button className="btn-yes" onClick={enviarPedido} disabled={enviando}>
                  {enviando ? "Enviando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCliente;