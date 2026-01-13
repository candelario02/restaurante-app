import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  Utensils,
  Coffee,
  Pizza,
  Droplet,
  ArrowLeft,
  ShoppingCart,
  X,
  Send
} from 'lucide-react';

const MenuCliente = () => {
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [verCarrito, setVerCarrito] = useState(false);

  useEffect(() => {
    if (!categoriaActual) return;

    setProductos([]);

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

  // ------------------ CATEGORÍAS ------------------
  if (!categoriaActual) {
    return (
      <div className="main-categories">
        <div className="header-brand">
          <h1>Nuestro Menú</h1>
          <p>Selecciona una categoría</p>
        </div>

        <div className="grid-menu">
          <button className="cat-circle" onClick={() => setCategoriaActual('Menu')}>
            <Pizza size={50} color="#f59e0b" />
            <span>Comidas</span>
          </button>

          <button className="cat-circle" onClick={() => setCategoriaActual('Cafeteria')}>
            <Coffee size={50} color="#6366f1" />
            <span>Café</span>
          </button>

          <button className="cat-circle" onClick={() => setCategoriaActual('Bebidas')}>
            <Droplet size={50} color="#06b6d4" />
            <span>Bebidas</span>
          </button>

          <button className="cat-circle" onClick={() => setCategoriaActual('Entradas')}>
            <Utensils size={50} color="#ec4899" />
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

  // ------------------ PRODUCTOS ------------------
  return (
    <div className="product-view">
      <button className="btn-back-circle" onClick={() => setCategoriaActual(null)}>
        <ArrowLeft size={28} />
      </button>

      <div className="header-lista-fija">
        <h2>{categoriaActual}</h2>
      </div>

      <div className="product-grid-layout">
        {productos.map(p => (
          <div key={p.id} className="food-card">
            <div className="food-img-container">
              <img src={p.img} alt={p.nombre} className="food-img" />
              <button
                className="btn-add-food"
                onClick={() => agregarAlCarrito(p)}
              >
                +
              </button>
            </div>

            <div className="food-info">
              <h3>{p.nombre}</h3>
              <span className="food-price">S/ {p.precio.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {verCarrito && (
        <div className="overlay-msg">
          <div className="msg-box modal-confirm" style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h2>Tu Pedido</h2>
              <button
                onClick={() => setVerCarrito(false)}
                style={{ background: 'none', border: 'none' }}
              >
                <X />
              </button>
            </div>

            <div className="items-scroll" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {carrito.map((item, i) => (
                <div key={i} className="cart-item">
                  <span>{item.nombre}</span>
                  <strong>S/ {item.precio.toFixed(2)}</strong>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <h3>Total: S/ {total.toFixed(2)}</h3>
              <button
                className="btn-save"
                style={{ width: '100%' }}
                onClick={() => alert("Pedido enviado")}
              >
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
