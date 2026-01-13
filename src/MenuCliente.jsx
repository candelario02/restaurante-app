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

  /* --- VISTA DE CATEGORÍAS (Corregida para imagen 2) --- */
  if (!categoriaActual) {
    return (
      <div className="admin-container">
        <div className="menu-principal-wrapper" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
          
          <div className="header-brand" style={{ marginBottom: '50px' }}>
            <h1 className="titulo-principal" style={{ fontSize: '2.5rem', fontWeight: '800' }}>Nuestro Menú</h1>
            <p className="subtitulo-principal" style={{ opacity: 0.7 }}>Selecciona una categoría</p>
          </div>

          {/* Grid de 2 columnas para que los círculos se vean grandes */}
          <div className="categorias-grid-principal" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '30px',
            padding: '20px'
          }}>
            
            <div className="categoria-item" onClick={() => setCategoriaActual('Menu')} style={{ cursor: 'pointer' }}>
              <div className="categoria-circulo" style={{ 
                width: '120px', 
                height: '120px', 
                backgroundColor: '#FFF4E5', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 15px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
              }}>
                <Pizza size={60} color="#FF9800" />
              </div>
              <span style={{ fontWeight: '700', fontSize: '1.2rem' }}>Comidas</span>
            </div>

            <div className="categoria-item" onClick={() => setCategoriaActual('Cafeteria')} style={{ cursor: 'pointer' }}>
              <div className="categoria-circulo" style={{ 
                width: '120px', 
                height: '120px', 
                backgroundColor: '#E8F5E9', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 15px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
              }}>
                <Coffee size={60} color="#4CAF50" />
              </div>
              <span style={{ fontWeight: '700', fontSize: '1.2rem' }}>Café</span>
            </div>

            <div className="categoria-item" onClick={() => setCategoriaActual('Bebidas')} style={{ cursor: 'pointer' }}>
              <div className="categoria-circulo" style={{ 
                width: '120px', 
                height: '120px', 
                backgroundColor: '#E3F2FD', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 15px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
              }}>
                <Droplet size={60} color="#2196F3" />
              </div>
              <span style={{ fontWeight: '700', fontSize: '1.2rem' }}>Bebidas</span>
            </div>

            <div className="categoria-item" onClick={() => setCategoriaActual('Entradas')} style={{ cursor: 'pointer' }}>
              <div className="categoria-circulo" style={{ 
                width: '120px', 
                height: '120px', 
                backgroundColor: '#FCE4EC', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 15px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
              }}>
                <Utensils size={60} color="#E91E63" />
              </div>
              <span style={{ fontWeight: '700', fontSize: '1.2rem' }}>Entradas</span>
            </div>

          </div>
        </div>

        {carrito.length > 0 && (
          <button 
            className="btn-top-gestion active" 
            style={{ position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, padding: '15px 30px', borderRadius: '50px' }}
            onClick={() => setVerCarrito(true)}
          >
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
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
          <button className="btn-back-inline" onClick={() => setCategoriaActual(null)}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ fontSize: '2rem' }}>{categoriaActual}</h2>
        </div>

        <div className="productos-grid">
          {productos.map(p => (
            <div key={p.id} className="producto-card">
              <div className="card-img-container" style={{ height: '200px' }}>
                <img src={p.img} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="card-body" style={{ padding: '20px' }}>
                <h3 style={{ marginBottom: '10px' }}>{p.nombre}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="precio-text" style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary)' }}>
                    S/ {p.precio.toFixed(2)}
                  </span>
                  <button className="btn-add-cart" onClick={() => agregarAlCarrito(p)} style={{ 
                    width: '45px', height: '45px', borderRadius: '50%', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '1.5rem' 
                  }}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODALES - Lógica Intacta */}
      {verCarrito && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2>Tu Pedido</h2>
            <div className="carrito-lista">
              {carrito.map((item, i) => (
                <div key={i} className="carrito-item-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <span>{item.nombre}</span>
                  <strong>S/ {item.precio.toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <h3 style={{ margin: '20px 0' }}>Total: S/ {total.toFixed(2)}</h3>
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