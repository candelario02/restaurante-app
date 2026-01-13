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
        cliente: {
          nombre,
          telefono,
          direccion
        },
        productos: carrito,
        total,
        estado: "pendiente",
        fecha: new Date()
      });

      alert("Pedido enviado correctamente");

      // Resetear todo
      setCarrito([]);
      setNombre('');
      setTelefono('');
      setDireccion('');
      setMostrarFormulario(false);
      setVerCarrito(false);

    } catch (error) {
      console.error(error);
      alert("Error al enviar pedido");
    } finally {
      setEnviando(false);
    }
  };

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
            <Pizza size={50} />
            <span>Comidas</span>
          </button>
          <button className="cat-circle" onClick={() => setCategoriaActual('Cafeteria')}>
            <Coffee size={50} />
            <span>Café</span>
          </button>
          <button className="cat-circle" onClick={() => setCategoriaActual('Bebidas')}>
            <Droplet size={50} />
            <span>Bebidas</span>
          </button>
          <button className="cat-circle" onClick={() => setCategoriaActual('Entradas')}>
            <Utensils size={50} />
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

      <div className="product-grid-layout">
        {productos.map(p => (
          <div key={p.id} className="food-card">
            <img src={p.img} alt={p.nombre} />
            <button className="btn-add-food" onClick={() => agregarAlCarrito(p)}>+</button>
            <h3>{p.nombre}</h3>
            <span>S/ {p.precio.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {verCarrito && (
        <div className="overlay-msg">
          <div className="msg-box modal-confirm">
            <h2>Tu Pedido</h2>
            <button onClick={() => setVerCarrito(false)}><X /></button>

            {carrito.map((item, i) => (
              <div key={i}>
                {item.nombre} - S/ {item.precio.toFixed(2)}
              </div>
            ))}

            <h3>Total: S/ {total.toFixed(2)}</h3>

            <button onClick={() => setMostrarFormulario(true)}>
              <Send /> Continuar
            </button>
          </div>
        </div>
      )}

      {mostrarFormulario && (
        <div className="overlay-msg">
          <div className="msg-box modal-confirm">
            <h2>Datos del Cliente</h2>

            <div className="input-group">
              <User />
              <input placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>

            <div className="input-group">
              <Phone />
              <input placeholder="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} />
            </div>

            <div className="input-group">
              <MapPin />
              <input placeholder="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} />
            </div>

            <button onClick={enviarPedido} disabled={enviando}>
              {enviando ? "Enviando..." : "Confirmar Pedido"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCliente;
