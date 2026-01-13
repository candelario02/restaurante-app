import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { Utensils, Coffee, Pizza, Droplet, ArrowLeft, ShoppingCart, X, Send } from 'lucide-react';

const MenuCliente = ({ esAdmin }) => {
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [verCarrito, setVerCarrito] = useState(false);

  useEffect(() => {
    if (categoriaActual) {
      const q = query(collection(db, "productos"), where("categoria", "==", categoriaActual));
      return onSnapshot(q, (snapshot) => {
        setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
  }, [categoriaActual]);

  const agregarAlCarrito = (p) => {
    setCarrito([...carrito, p]);
  };

  const total = carrito.reduce((acc, item) => acc + item.precio, 0);

  const enviarPedido = async () => {
    try {
      await addDoc(collection(db, "pedidos"), {
        items: carrito,
        total: total,
        estado: "Pendiente",
        fecha: new Date().toISOString(),
        tipo: esAdmin ? "Venta Directa" : "Pedido Cliente"
      });
      alert(esAdmin ? "Venta registrada" : "¡Pedido enviado a cocina!");
      setCarrito([]);
      setVerCarrito(false);
    } catch (e) {
      alert("Error al procesar");
    }
  };

  if (!categoriaActual) {
    return (
      <div className="main-categories">
        <h2>Selecciona una Categoría</h2>
        <div className="grid-menu">
          <button className="cat-circle" onClick={() => setCategoriaActual('Menu')}>
            <Pizza size={40} color="#f59e0b" /> <span>Comidas</span>
          </button>
          <button className="cat-circle" onClick={() => setCategoriaActual('Cafeteria')}>
            <Coffee size={40} color="#6366f1" /> <span>Café</span>
          </button>
          <button className="cat-circle" onClick={() => setCategoriaActual('Bebidas')}>
            <Droplet size={40} color="#06b6d4" /> <span>Bebidas</span>
          </button>
          <button className="cat-circle" onClick={() => setCategoriaActual('Entradas')}>
            <Utensils size={40} color="#ec4899" /> <span>Entradas</span>
          </button>
        </div>
        {carrito.length > 0 && (
          <div className="cart-bar" onClick={() => setVerCarrito(true)}>
            <ShoppingCart /> <span>{carrito.length} items - S/ {total.toFixed(2)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="product-list">
      <div className="header-lista">
        <button onClick={() => setCategoriaActual(null)} className="btn-back"><ArrowLeft /> Volver</button>
        <button onClick={() => setVerCarrito(true)} className="btn-cart-icon"><ShoppingCart /> ({carrito.length})</button>
      </div>
      
      <h2>{categoriaActual}</h2>
      {productos.map(p => (
        <div key={p.id} className="product-card">
          <img src={p.img} alt={p.nombre} className="product-img" />
          <div className="product-info">
            <h3>{p.nombre}</h3>
            <span className="price-tag">S/ {p.precio.toFixed(2)}</span>
          </div>
          <button className="btn-add" onClick={() => agregarAlCarrito(p)}>+</button>
        </div>
      ))}

      {verCarrito && (
        <div className="cart-modal">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setVerCarrito(false)}><X /></button>
            <h2>Tu Pedido</h2>
            <div className="items-scroll">
              {carrito.map((item, i) => (
                <div key={i} className="cart-item">
                  <span>{item.nombre}</span>
                  <strong>S/ {item.precio.toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <div className="cart-footer">
              <h3>Total: S/ {total.toFixed(2)}</h3>
              <button className="btn-send" onClick={enviarPedido}>
                <Send /> {esAdmin ? "COBRAR VENTA" : "ENVIAR PEDIDO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCliente;