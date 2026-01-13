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
  X,
  Send,
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

  /* --- VISTA DE CATEGORÍAS (Círculos) --- */
  if (!categoriaActual) {
    return (
      <div className="admin-container">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1>Nuestro Menú</h1>
          <p>Selecciona una categoría</p>
        </div>

        <div className="categorias-container">
          <div className="categoria-item" onClick={() => setCategoriaActual('Menu')}>
            <div className="categoria-circulo"><Pizza size={50} /></div>
            <span>Comidas</span>
          </div>
          <div className="categoria-item" onClick={() => setCategoriaActual('Cafeteria')}>
            <div className="categoria-circulo"><Coffee size={50} /></div>
            <span>Café</span>
          </div>
          <div className="categoria-item" onClick={() => setCategoriaActual('Bebidas')}>
            <div className="categoria-circulo"><Droplet size={50} /></div>
            <span>Bebidas</span>
          </div>
          <div className="categoria-item" onClick={() => setCategoriaActual('Entradas')}>
            <div className="categoria-circulo"><Utensils size={50} /></div>
            <span>Entradas</span>
          </div>
        </div>

        {carrito.length > 0 && (
          <div className="btn-top-gestion active" 
               style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}
               onClick={() => setVerCarrito(true)}>
            <ShoppingCart size={20} />
            <span>Ver mi pedido (S/ {total.toFixed(2)})</span>
          </div>
        )}
      </div>
    );
  }

  /* --- VISTA DE PRODUCTOS --- */
  return (
    <div className="admin-container">
      <button className="btn-back-inline" onClick={() => setCategoriaActual(null)}>
        <ArrowLeft size={24} />
      </button>

      <div className="productos-grid">
        {productos.map(p => (
          <div key={p.id} className="producto-card">
            <div className="producto-img-container">
              <img src={p.img} alt={p.nombre} />
            </div>
            <div className="producto-info">
              <h3>{p.nombre}</h3>
              <div className="producto-footer">
                <span className="precio-tag">S/ {p.precio.toFixed(2)}</span>
                <button className="btn-top-gestion active" onClick={() => agregarAlCarrito(p)}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CARRITO */}
      {verCarrito && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2>Tu Pedido</h2>
            {carrito.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span>{item.nombre}</span>
                <strong>S/ {item.precio.toFixed(2)}</strong>
              </div>
            ))}
            <h3 style={{ marginTop: '20px' }}>Total: S/ {total.toFixed(2)}</h3>
            <div className="modal-buttons">
              <button className="btn-no" onClick={() => setVerCarrito(false)}>Cerrar</button>
              <button className="btn-top-gestion active" style={{ width: '100%' }} onClick={() => setMostrarFormulario(true)}>Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DATOS CLIENTE */}
      {mostrarFormulario && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2>Datos de Entrega</h2>
            <div className="login-form">
              <div className="input-group">
                <User className="input-icon" size={18} />
                <input placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
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