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
  Plus
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
      alert("¡Pedido enviado correctamente! Pronto nos comunicaremos contigo.");
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

  /* --- VISTA DE CATEGORÍAS (PRINCIPAL) --- */
  if (!categoriaActual) {
    return (
      <div className="admin-container view-principal">
        <div className="menu-principal-wrapper">
          
          <div className="header-brand">
            <h1 className="titulo-principal">Nuestro Menú</h1>
            <p className="subtitulo-principal" style={{textAlign: 'center', color: 'var(--text-muted)'}}>
              Selecciona una categoría para ver los platos
            </p>
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
          <button 
            className="btn-login-submit" 
            onClick={() => setVerCarrito(true)}
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
              zIndex: 100
            }}
          >
            <ShoppingCart size={22} />
            <span>Ver mi pedido (S/ {total.toFixed(2)})</span>
          </button>
        )}
      </div>
    );
  }

  /* --- VISTA DE PRODUCTOS POR CATEGORÍA --- */
  return (
    <div className="admin-container">
      <div className="productos-wrapper">
        <div className="view-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
          <button className="btn-back-inline" onClick={() => setCategoriaActual(null)}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>{categoriaActual}</h2>
        </div>

        <div className="productos-grid">
          {productos.map(p => (
            <div key={p.id} className="producto-card">
              {/* MEJORA: Clase para imagen uniforme desde App.css */}
              <img src={p.img} alt={p.nombre} className="img-producto-cliente" />
              
              <div style={{ padding: '16px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>{p.nombre}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1.2rem' }}>
                    S/ {p.precio.toFixed(2)}
                  </span>
                  <button 
                    className="btn-back-inline" 
                    style={{ background: 'var(--primary)', color: 'white' }}
                    onClick={() => agregarAlCarrito(p)}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: CARRITO */}
      {verCarrito && (
        <div className="modal-overlay">
          <div className="msg-box">
            <h2 style={{ marginBottom: '20px' }}>Tu Pedido</h2>
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
              {carrito.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{item.nombre}</span>
                  <strong>S/ {item.precio.toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '25px' }}>
              Total: S/ {total.toFixed(2)}
            </div>
            <div className="modal-buttons">
              <button className="btn-no" onClick={() => setVerCarrito(false)}>Atrás</button>
              <button className="btn-yes" style={{ background: 'var(--success)' }} onClick={() => setMostrarFormulario(true)}>Pedir ahora</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FORMULARIO ENTREGA */}
      {mostrarFormulario && (
        <div className="modal-overlay">
          <div className="msg-box">
            <h2 style={{ marginBottom: '20px' }}>Datos de entrega</h2>
            <div className="login-form">
              <div className="input-group">
                <User className="input-icon" size={18} />
                <input placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div className="input-group">
                <Phone className="input-icon" size={18} />
                <input type="tel" placeholder="WhatsApp (9 dígitos)" value={telefono} onChange={e => setTelefono(e.target.value)} />
              </div>
              <div className="input-group">
                <MapPin className="input-icon" size={18} />
                <input placeholder="Dirección completa" value={direccion} onChange={e => setDireccion(e.target.value)} />
              </div>
              <div className="modal-buttons" style={{ marginTop: '20px' }}>
                <button className="btn-no" onClick={() => setMostrarFormulario(false)}>Atrás</button>
                <button 
                  className="btn-login-submit" 
                  onClick={enviarPedido} 
                  disabled={enviando}
                >
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