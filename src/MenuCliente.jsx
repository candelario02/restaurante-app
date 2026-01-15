import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot, addDoc, doc } from 'firebase/firestore';
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
  CheckCircle,
  Clock,
  ChefHat,
  Truck
} from 'lucide-react';

const MenuCliente = () => {
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [avisoAgregado, setAvisoAgregado] = useState(null);

  // Datos del cliente
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tipoPedido, setTipoPedido] = useState('mesa'); // 'mesa' o 'delivery'
  const [enviando, setEnviando] = useState(false);

  // Estado para el seguimiento del pedido en curso
  const [pedidoActivoId, setPedidoActivoId] = useState(localStorage.getItem('ultimoPedidoId'));
  const [datosPedidoRealtime, setDatosPedidoRealtime] = useState(null);

  // 1. Efecto para cargar productos por categoría
  useEffect(() => {
    if (!categoriaActual) return;
    const q = query(
      collection(db, "productos"),
      where("categoria", "==", categoriaActual),
      where("disponible", "==", true)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [categoriaActual]);

  // 2. Efecto para SEGUIMIENTO en tiempo real del pedido enviado
  useEffect(() => {
    if (!pedidoActivoId) return;

    const unsub = onSnapshot(doc(db, "pedidos", pedidoActivoId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDatosPedidoRealtime(data);
        // Si el admin ya lo marcó como entregado, lo quitamos de la vista después de 10 segundos
        if (data.estado === 'entregado') {
          setTimeout(() => {
            setPedidoActivoId(null);
            localStorage.removeItem('ultimoPedidoId');
            setDatosPedidoRealtime(null);
          }, 10000);
        }
      }
    });
    return () => unsub();
  }, [pedidoActivoId]);

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => [...prev, producto]);
    setAvisoAgregado(producto.nombre);
    setTimeout(() => setAvisoAgregado(null), 1500);
  };

  const total = carrito.reduce((acc, item) => acc + (Number(item.precio) || 0), 0);

  const enviarPedido = async (e) => {
    if (e) e.preventDefault();
    
    // Validación según tipo de pedido
    if (tipoPedido === 'mesa' && !nombre) return alert("Por favor, ingresa tu nombre");
    if (tipoPedido === 'delivery' && (!nombre || !telefono || !direccion)) return alert("Completa todos los datos");
    
    setEnviando(true);
    try {
      const nuevoPedido = {
        cliente: { 
          nombre, 
          telefono: tipoPedido === 'mesa' ? 'En Mesa' : telefono, 
          direccion: tipoPedido === 'mesa' ? 'Mesa del Local' : direccion,
          tipo: tipoPedido 
        },
        productos: carrito.map(p => ({ nombre: p.nombre, precio: p.precio })),
        total,
        estado: "pendiente",
        fecha: new Date()
      };

      const docRef = await addDoc(collection(db, "pedidos"), nuevoPedido);
      
      // Guardamos el ID para el seguimiento
      setPedidoActivoId(docRef.id);
      localStorage.setItem('ultimoPedidoId', docRef.id);

      setCarrito([]);
      setMostrarFormulario(false);
      setVerCarrito(false);
      setCategoriaActual(null);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al enviar el pedido.");
    } finally {
      setEnviando(false);
    }
  };

  const renderBotonFlotante = () => (
    carrito.length > 0 && !verCarrito && !mostrarFormulario && !pedidoActivoId && (
      <button className="btn-carrito-flotante" onClick={() => setVerCarrito(true)}>
        <ShoppingCart size={20} />
        <span>S/ {total.toFixed(2)} ({carrito.length})</span>
      </button>
    )
  );

  return (
    <div className="admin-container">
      {avisoAgregado && (
        <div className="toast-agregado">
          <CheckCircle size={18} /> {avisoAgregado} agregado
        </div>
      )}

      {renderBotonFlotante()}

      {/* --- VISTA DE SEGUIMIENTO (Si hay un pedido en curso) --- */}
      {pedidoActivoId && datosPedidoRealtime && (
        <div className="view-principal" style={{padding: '20px'}}>
           <div className="msg-box" style={{maxWidth: '100%', border: '2px solid var(--primary)'}}>
              <h2 className="titulo-principal" style={{fontSize: '1.5rem'}}>¡Pedido Recibido!</h2>
              <p>Hola <strong>{datosPedidoRealtime.cliente.nombre}</strong>, estamos trabajando en ello.</p>
              
              <div className="status-tracker" style={{margin: '30px 0', display: 'flex', justifyContent: 'space-around'}}>
                <div style={{opacity: 1, textAlign: 'center', color: 'var(--primary)'}}>
                  <Clock size={32} />
                  <p style={{fontSize: '0.7rem', fontWeight: 'bold'}}>RECIBIDO</p>
                </div>
                <div style={{opacity: datosPedidoRealtime.estado === 'preparando' || datosPedidoRealtime.estado === 'enviado' || datosPedidoRealtime.estado === 'entregado' ? 1 : 0.2, textAlign: 'center', color: 'var(--warning)'}}>
                  <ChefHat size={32} />
                  <p style={{fontSize: '0.7rem', fontWeight: 'bold'}}>COCINANDO</p>
                </div>
                <div style={{opacity: datosPedidoRealtime.estado === 'enviado' || datosPedidoRealtime.estado === 'entregado' ? 1 : 0.2, textAlign: 'center', color: 'var(--success)'}}>
                  <Truck size={32} />
                  <p style={{fontSize: '0.7rem', fontWeight: 'bold'}}>EN CAMINO</p>
                </div>
              </div>

              <div className={`status-badge ${datosPedidoRealtime.estado}`}>
                Estado: {datosPedidoRealtime.estado.toUpperCase()}
              </div>

              <p className="text-muted" style={{marginTop: '20px', fontSize: '0.8rem'}}>
                No cierres esta ventana para ver cuándo tu plato esté listo.
              </p>
           </div>
        </div>
      )}

      {/* --- FLUJO NORMAL DE COMPRA (Solo se muestra si no hay pedido activo) --- */}
      {!pedidoActivoId && (
        <>
          {!categoriaActual ? (
            <div className="view-principal">
              <div className="menu-principal-wrapper">
                <div className="header-brand">
                  <h1 className="titulo-principal">Nuestro Menú</h1>
                  <p className="text-muted">Selecciona para empezar tu pedido</p>
                </div>
                <div className="categorias-grid-principal">
                  <div className="categoria-item" onClick={() => setCategoriaActual('Menu')}><div className="categoria-circulo bg-comidas"><Pizza size={90} className="icon-main" /></div><span className="categoria-label">Comidas</span></div>
                  <div className="categoria-item" onClick={() => setCategoriaActual('Cafeteria')}><div className="categoria-circulo bg-cafe"><Coffee size={90} className="icon-main" /></div><span className="categoria-label">Cafetería</span></div>
                  <div className="categoria-item" onClick={() => setCategoriaActual('Bebidas')}><div className="categoria-circulo bg-bebidas"><Droplet size={90} className="icon-main" /></div><span className="categoria-label">Bebidas</span></div>
                  <div className="categoria-item" onClick={() => setCategoriaActual('Entradas')}><div className="categoria-circulo bg-entradas"><Utensils size={90} className="icon-main" /></div><span className="categoria-label">Entradas</span></div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="view-header" style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px'}}>
                <button className="btn-back-inline" onClick={() => setCategoriaActual(null)}><ArrowLeft size={24} /></button>
                <h2 className="titulo-principal" style={{ fontSize: '2rem', margin: 0 }}>{categoriaActual}</h2>
              </div>
              <div className="productos-grid">
                {productos.map(p => (
                  <div key={p.id} className="producto-card">
                    <img src={p.img} alt={p.nombre} className="producto-foto" />
                    <div className="producto-info">
                      <h3>{p.nombre}</h3>
                      <div className="precio-y-accion">
                        <span className="precio-tag">S/ {p.precio.toFixed(2)}</span>
                        <button className="btn-plus-item" onClick={() => agregarAlCarrito(p)}><Plus size={20} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* MODAL 1: RESUMEN CARRITO */}
      {verCarrito && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2 className="titulo-principal">Tu Pedido</h2>
            <div className="carrito-lista">
              {carrito.map((item, i) => (
                <div key={i} className="carrito-item-fila"><span>{item.nombre}</span><strong>S/ {item.precio.toFixed(2)}</strong></div>
              ))}
            </div>
            <div className="carrito-total">Total: S/ {total.toFixed(2)}</div>
            <div className="modal-buttons">
              <button className="btn-no" onClick={() => setVerCarrito(false)}>Atrás</button>
              <button className="btn-yes" onClick={() => { setVerCarrito(false); setMostrarFormulario(true); }}>Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: FORMULARIO DINÁMICO (MESA O DELIVERY) */}
      {mostrarFormulario && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2 className="titulo-principal">¿Cómo recibes tu pedido?</h2>
            
            <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
               <button 
                className={`btn-top-gestion ${tipoPedido === 'mesa' ? 'active' : ''}`}
                style={{flex: 1, padding: '10px'}}
                onClick={() => setTipoPedido('mesa')}
               >En Mesa</button>
               <button 
                className={`btn-top-gestion ${tipoPedido === 'delivery' ? 'active' : ''}`}
                style={{flex: 1, padding: '10px'}}
                onClick={() => setTipoPedido('delivery')}
               >Delivery</button>
            </div>

            <div className="login-form">
              <div className="input-group">
                <User className="input-icon" size={18} />
                <input type="text" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>

              {tipoPedido === 'delivery' && (
                <>
                  <div className="input-group">
                    <Phone className="input-icon" size={18} />
                    <input type="tel" placeholder="WhatsApp" value={telefono} onChange={(e) => setTelefono(e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <MapPin className="input-icon" size={18} />
                    <input type="text" placeholder="Dirección exacta" value={direccion} onChange={(e) => setDireccion(e.target.value)} required />
                  </div>
                </>
              )}

              <div className="modal-buttons">
                <button className="btn-no" type="button" onClick={() => setMostrarFormulario(false)}>Atrás</button>
                <button 
                  className={`btn-login-submit ${enviando ? 'btn-loading' : ''}`} 
                  onClick={enviarPedido} 
                  disabled={enviando}
                >
                  {enviando ? "Enviando..." : "Confirmar Ahora"}
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