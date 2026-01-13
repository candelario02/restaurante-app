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

  /* --- VISTA DE CATEGORÍAS (Círculos - Sesión 3 del CSS) --- */
  if (!categoriaActual) {
    return (
      <div className="admin-container">
        {/* Contenedor limitador para centrar el contenido */}
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="header-brand" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Nuestro Menú</h1>
            <p className="text-muted">Selecciona una categoría para empezar</p>
          </div>

          <div className="categorias-container">
            <div className="categoria-item" onClick={() => setCategoriaActual('Menu')}>
              <div className="categoria-circulo"><Pizza size={60} color="var(--primary)" /></div>
              <span>Comidas</span>
            </div>
            <div className="categoria-item" onClick={() => setCategoriaActual('Cafeteria')}>
              <div className="categoria-circulo"><Coffee size={60} color="var(--primary)" /></div>
              <span>Café</span>
            </div>
            <div className="categoria-item" onClick={() => setCategoriaActual('Bebidas')}>
              <div className="categoria-circulo"><Droplet size={60} color="var(--primary)" /></div>
              <span>Bebidas</span>
            </div>
            <div className="categoria-item" onClick={() => setCategoriaActual('Entradas')}>
              <div className="categoria-circulo"><Utensils size={60} color="var(--primary)" /></div>
              <span>Entradas</span>
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
            <span>Ver mi pedido (S/ {total.toFixed(2)})</span>
          </button>
        )}
      </div>
    );
  }

  /* --- VISTA DE PRODUCTOS (Grid - Sesión 6 del CSS) --- */
  return (
    <div className="admin-container">
      {/* Contenedor limitador para que los productos no ocupen toda la pantalla */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
          <button className="btn-back-inline" onClick={() => setCategoriaActual(null)}>
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ margin: 0 }}>{categoriaActual}</h2>
        </div>

        <div className="productos-grid">
          {productos.map(p => (
            <div key={p.id} className="producto-card">
              <div style={{ width: '100%', height: '200px', overflow: 'hidden' }}>
                <img 
                  src={p.img} 
                  alt={p.nombre} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
              <div style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>{p.nombre}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '800', fontSize: '1.3rem', color: 'var(--primary)' }}>
                    S/ {p.precio.toFixed(2)}
                  </span>
                  <button 
                    className="btn-top-gestion active" 
                    onClick={() => agregarAlCarrito(p)}
                    style={{ width: '40px', height: '40px', padding: 0, justifyContent: 'center', borderRadius: '50%' }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODALES (Mantenidos exactamente como los tenías) */}
      {verCarrito && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2>Tu Pedido</h2>
            <div style={{ margin: '20px 0', textAlign: 'left' }}>
              {carrito.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{item.nombre}</span>
                  <strong>S/ {item.precio.toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <h3 style={{ marginBottom: '25px' }}>Total: S/ {total.toFixed(2)}</h3>
            <div className="modal-buttons">
              <button className="btn-no" onClick={() => setVerCarrito(false)}>Atrás</button>
              <button className="btn-top-gestion active" style={{ justifyContent: 'center' }} onClick={() => setMostrarFormulario(true)}>Pedir ahora</button>
            </div>
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2>Finalizar Pedido</h2>
            <div className="login-form">
              <div className="input-group">
                <User className="input-icon" size={18} />
                <input placeholder="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div className="input-group">
                <Phone className="input-icon" size={18} />
                <input placeholder="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} />
              </div>
              <div className="input-group">
                <MapPin className="input-icon" size={18} />
                <input placeholder="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} />
              </div>
              <div className="modal-buttons">
                <button className="btn-no" onClick={() => setMostrarFormulario(false)}>Atrás</button>
                <button className="btn-yes" style={{ background: 'var(--success)' }} onClick={enviarPedido} disabled={enviando}>
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