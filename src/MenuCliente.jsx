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

  const total = carrito.reduce((acc, item) => acc + (Number(item.precio) || 0), 0);

  const enviarPedido = async () => {
    if (!nombre || !telefono || !direccion) return;
    
    setEnviando(true);
    try {
      await addDoc(collection(db, "pedidos"), {
        cliente: { nombre, telefono, direccion },
        productos: carrito,
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
    } finally {
      setEnviando(false);
    }
  };

  /* --- VISTA 1: CATEGORÍAS --- */
  if (!categoriaActual) {
    return (
      <div className="admin-container view-principal">
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

        {/* Solo mostramos el carrito si hay algo agregado */}
        {carrito.length > 0 && (
          <button 
            className="btn-login-submit" 
            onClick={() => setVerCarrito(true)}
            style={{
              position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', 
              width: '90%', maxWidth: '400px', zIndex: 1100, boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)'
            }}
          >
            <ShoppingCart size={22} />
            <span>Ver mi pedido (S/ {total.toFixed(2)})</span>
          </button>
        )}

        {pedidoExitoso && (
          <div className="overlay-msg">
            <div className="mensaje-alerta exito" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={50} color="white" />
              <div style={{ textAlign: 'center' }}>
                ¡Pedido enviado con éxito!<br/>Pronto nos comunicaremos contigo.
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* --- VISTA 2: PRODUCTOS --- */
  return (
    <div className="admin-container">
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
              <div style={{ position: 'relative' }}>
                <img src={p.img} alt={p.nombre} style={{width: '100%', height: '200px', objectFit: 'cover'}} />
                {/* BOTÓN SOBRE LA FOTO */}
                <button 
                  className="btn-back-inline" 
                  onClick={() => agregarAlCarrito(p)}
                  style={{
                    position: 'absolute', bottom: '10px', right: '10px',
                    background: 'var(--primary)', color: 'white', borderRadius: '50%', padding: '10px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                  }}
                >
                  <Plus size={24} />
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>{p.nombre}</h3>
                <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.3rem' }}>
                  S/ {p.precio.toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL CARRITO */}
      {verCarrito && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2 className="titulo-principal" style={{ fontSize: '1.8rem' }}>Tu Pedido</h2>
            <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '20px' }}>
              {carrito.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{item.nombre}</span>
                  <strong>S/ {item.precio.toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '25px', color: 'var(--primary)' }}>
              Total: S/ {total.toFixed(2)}
            </div>
            <div className="modal-buttons">
              <button className="btn-no" onClick={() => setVerCarrito(false)}>Cerrar</button>
              <button className="btn-yes" style={{ background: 'var(--success)' }} onClick={() => setMostrarFormulario(true)}>Pedir ahora</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORMULARIO */}
      {mostrarFormulario && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2 className="titulo-principal" style={{ fontSize: '1.8rem' }}>Datos de Entrega</h2>
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
                  {enviando ? <div className="spinner-loader"></div> : "Confirmar Pedido"}
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