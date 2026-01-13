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

  // Pantalla Principal de Categorías
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

  // PANTALLA DE PRODUCTOS (ESTILO CUADRÍCULA COMO TU IMAGEN)
  return (
    <div className="product-view">
      <div className="header-lista-fija">
        <button onClick={() => setCategoriaActual(null)} className="btn-back-circle">
          <ArrowLeft size={24}/>
        </button>
        <h2>{categoriaActual}</h2>
        <div className="spacer"></div>
      </div>
      
      <div className="product-grid-layout">
        {productos.map(p => (
          <div key={p.id} className="food-card">
            <div className="food-img-container">
              <img src={p.img} alt={p.nombre} className="food-img" />
              <button className="btn-add-food" onClick={() => agregarAlCarrito(p)}>+</button>
            </div>
            <div className="food-info">
              <h3>{p.nombre}</h3>
              <span className="food-price">S/ {p.precio.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

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
              <h3>Total: S/ {total.toFixed(2)}</h3>
              <button className="btn-send" onClick={() => alert("Pedido enviado")}>
                <Send size={18} /> ENVIAR PEDIDO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCliente;