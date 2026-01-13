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
      // FILTRO: Solo trae productos que el admin marcó como disponibles
      const q = query(
        collection(db, "productos"), 
        where("categoria", "==", categoriaActual),
        where("disponible", "==", true) 
      );
      
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
        <div className="header-brand">
          <h1>Nuestro Menú</h1>
          <p>Selecciona una categoría</p>
        </div>
        <div className="grid-menu">
          <button className="cat-circle" onClick={() => setCategoriaActual('Menu')}>
            <div className="icon-wrapper"><Pizza size={35} color="#f59e0b" /></div>
            <span>Comidas</span>
          </button>
          <button className="cat-circle" onClick={() => setCategoriaActual('Cafeteria')}>
            <div className="icon-wrapper"><Coffee size={35} color="#6366f1" /></div>
            <span>Café</span>
          </button>
          <button className="cat-circle" onClick={() => setCategoriaActual('Bebidas')}>
            <div className="icon-wrapper"><Droplet size={35} color="#06b6d4" /></div>
            <span>Bebidas</span>
          </button>
          <button className="cat-circle" onClick={() => setCategoriaActual('Entradas')}>
            <div className="icon-wrapper"><Utensils size={35} color="#ec4899" /></div>
            <span>Entradas</span>
          </button>
        </div>
        
        {carrito.length > 0 && (
          <div className="cart-bar" onClick={() => setVerCarrito(true)}>
            <div className="cart-badge">{carrito.length}</div>
            <ShoppingCart /> 
            <span>Ver mi pedido</span>
            <strong>S/ {total.toFixed(2)}</strong>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="product-list-view">
      <div className="header-lista">
        <button onClick={() => setCategoriaActual(null)} className="btn-back">
          <ArrowLeft size={20}/> <span>Volver</span>
        </button>
        <div className="category-title">{categoriaActual}</div>
      </div>
      
      <div className="products-container">
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
      </div>

      {/* MODAL DEL CARRITO */}
      {verCarrito && (
        <div className="cart-modal">
          <div className="modal-content">
            <div className="modal-header">
               <h2>Tu Pedido</h2>
               <button className="close-btn" onClick={() => setVerCarrito(false)}><X /></button>
            </div>
            <div className="items-scroll">
              {carrito.map((item, i) => (
                <div key={i} className="cart-item">
                  <span>{item.nombre}</span>
                  <strong>S/ {item.precio.toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <div className="cart-footer">
              <div className="total-box">
                <span>Total a pagar</span>
                <h3>S/ {total.toFixed(2)}</h3>
              </div>
              <button className="btn-send" onClick={enviarPedido}>
                <Send size={18} /> {esAdmin ? "COBRAR VENTA" : "ENVIAR PEDIDO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCliente;