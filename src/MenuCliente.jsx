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
  MapPin,
  Plus,
  CheckCircle
} from 'lucide-react';

const MenuCliente = () => {
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [pedidoExitoso, setPedidoExitoso] = useState(false);
  const [avisoAgregado, setAvisoAgregado] = useState(null);

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
    // Mostrar pequeño comentario de confirmación
    setAvisoAgregado(producto.nombre);
    setTimeout(() => setAvisoAgregado(null), 1500);
  };

  const total = carrito.reduce((acc, item) => acc + (Number(item.precio) || 0), 0);

  const enviarPedido = async () => {
    if (!nombre || !telefono || !direccion) return;
    
    setEnviando(true);
    try {
      await addDoc(collection(db, "pedidos"), {
        cliente: { nombre, telefono, direccion },
        productos: carrito.map(p => ({ nombre: p.nombre, precio: p.precio })),
        total,
        estado: "pendiente",
        fecha: new Date()
      });
      
      setCarrito([]);
      setNombre('');
      setTelefono('');
      setDireccion('');
      setMostrarFormulario(false);
      setVerCarrito(false);
      setCategoriaActual(null);
      
      setPedidoExitoso(true);
      setTimeout(() => setPedidoExitoso(false), 4000);

    } catch (error) {
      console.error("Error al enviar pedido:", error);
      alert("Error al enviar el pedido. Revisa las reglas de Firebase.");
    } finally {
      setEnviando(false);
    }
  };

  // Componente del Botón Flotante (Se usa en ambas vistas)
  const BotonCarritoFlotante = () => (
    carrito.length > 0 && (
      <button 
        className="btn-carrito-flotante" 
        onClick={() => setVerCarrito(true)}
      >
        <ShoppingCart size={20} />
        <span>S/ {total.toFixed(2)} ({carrito.length})</span>
      </button>
    )
  );

  /* --- VISTA 1: CATEGORÍAS --- */
  if (!categoriaActual) {
    return (
      <div className="admin-container view-principal">
        <BotonCarritoFlotante />
        
        <div className="menu-principal-wrapper">
          <div className="header-brand">
            <h1 className="titulo-principal">Nuestro Menú</h1>
            <p className="text-muted">Selecciona una categoría para ver los platos</p>
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
              <span className="categoria-label">Cafetería</span>
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

        {/* MODALES DE CARRITO Y ÉXITO */}
        {verCarrito && <ModalCarrito />}
        {mostrarFormulario && <ModalFormulario />}
        {pedidoExitoso && <AlertaExito />}
      </div>
    );
  }

  /* --- VISTA 2: PRODUCTOS --- */
  return (
    <div className="admin-container">
      {/* Toast de confirmación al agregar */}
      {avisoAgregado && (
        <div className="toast-agregado">
          <CheckCircle size={18} /> {avisoAgregado} agregado
        </div>
      )}

      <BotonCarritoFlotante />

      <div className="view-header" style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px'}}>
        <button className="btn-back-inline" onClick={() => setCategoriaActual(null)}>
          <ArrowLeft size={24} />
        </button>
        <h2 className="titulo-principal" style={{ fontSize: '2rem', margin: 0 }}>{categoriaActual}</h2>
      </div>

      <div className="productos-grid">
        {productos.length === 0 ? (
          <p className="text-muted" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
            No hay productos disponibles.
          </p>
        ) : (
          productos.map(p => (
            <div key={p.id} className="producto-card">
              <div className="producto-imagen-wrapper">
                <img src={p.img} alt={p.nombre} className="producto-foto" />
              </div>

              <div className="producto-info">
                <h3>{p.nombre}</h3>
                <div className="precio-y-accion">
                  <span className="precio-tag">S/ {p.precio.toFixed(2)}</span>
                  <button 
                    className="btn-plus-item" 
                    onClick={() => agregarAlCarrito(p)}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {verCarrito && <ModalCarrito />}
      {mostrarFormulario && <ModalFormulario />}
      {pedidoExitoso && <AlertaExito />}
    </div>
  );

  /* --- SUB-COMPONENTES (MODALES) --- */

  function ModalCarrito() {
    return (
      <div className="overlay-msg">
        <div className="msg-box modal-carrito">
          <h2 className="titulo-principal">Tu Pedido</h2>
          <div className="carrito-lista">
            {carrito.map((item, i) => (
              <div key={i} className="carrito-item-fila">
                <span>{item.nombre}</span>
                <strong>S/ {item.precio.toFixed(2)}</strong>
              </div>
            ))}
          </div>
          <div className="carrito-total">
            Total: S/ {total.toFixed(2)}
          </div>
          <div className="modal-buttons">
            <button className="btn-no" onClick={() => setVerCarrito(false)}>Cerrar</button>
            <button className="btn-yes" onClick={() => setMostrarFormulario(true)}>Pedir ahora</button>
          </div>
        </div>
      </div>
    );
  }

  function ModalFormulario() {
    return (
      <div className="overlay-msg">
        <div className="msg-box">
          <h2 className="titulo-principal">Datos de Entrega</h2>
          <div className="login-form">
            <div className="input-group">
              <User className="input-icon" size={18} />
              <input placeholder="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} required />
            </div>
            <div className="input-group">
              <Phone className="input-icon" size={18} />
              <input type="tel" placeholder="WhatsApp / Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} required />
            </div>
            <div className="input-group">
              <MapPin className="input-icon" size={18} />
              <input placeholder="Dirección de entrega" value={direccion} onChange={e => setDireccion(e.target.value)} required />
            </div>
            <div className="modal-buttons">
              <button className="btn-no" type="button" onClick={() => setMostrarFormulario(false)}>Atrás</button>
              <button className={`btn-login-submit ${enviando ? 'btn-loading' : ''}`} onClick={enviarPedido} disabled={enviando}>
                {enviando ? "Enviando..." : "Confirmar Pedido"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function AlertaExito() {
    return (
      <div className="overlay-msg">
        <div className="mensaje-alerta exito">
          <CheckCircle size={50} color="white" />
          <div style={{ textAlign: 'center' }}>
            ¡Pedido enviado con éxito!<br/>Pronto nos comunicaremos contigo.
          </div>
        </div>
      </div>
    );
  }
};

export default MenuCliente;