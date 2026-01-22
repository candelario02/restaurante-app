import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
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

const MenuCliente = ({ restauranteId = "jekito_restobar" }) => {
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [verCarrito, setVerCarrito] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [avisoAgregado, setAvisoAgregado] = useState(null);
  const [logoRestaurante, setLogoRestaurante] = useState("/logo_resturante.gif");

  // Datos del cliente
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tipoPedido, setTipoPedido] = useState('mesa'); 
  const [enviando, setEnviando] = useState(false);

  // Estado para el seguimiento
  const [pedidoActivoId, setPedidoActivoId] = useState(localStorage.getItem(`ultimoPedido_${restauranteId}`));
  const [datosPedidoRealtime, setDatosPedidoRealtime] = useState(null);

  // 0. Cargar Logo y Configuración del Restaurante
  useEffect(() => {
    const cargarConfig = async () => {
      const docRef = doc(db, "configuraciones", restauranteId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().logoUrl) {
        setLogoRestaurante(docSnap.data().logoUrl);
      }
    };
    cargarConfig();
  }, [restauranteId]);

  // 1. Cargar productos filtrados por Restaurante y Categoría
  useEffect(() => {
    if (!categoriaActual) return;
    
    const q = query(
      collection(db, "productos"),
      where("restauranteId", "==", restauranteId),
      where("categoria", "==", categoriaActual),
      where("disponible", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [categoriaActual, restauranteId]);

  // 2. SEGUIMIENTO en tiempo real
  useEffect(() => {
    if (!pedidoActivoId) return;

    const unsub = onSnapshot(doc(db, "pedidos", pedidoActivoId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDatosPedidoRealtime(data);
        
        if (data.estado === 'entregado') {
          setTimeout(() => {
            setPedidoActivoId(null);
            localStorage.removeItem(`ultimoPedido_${restauranteId}`);
            setDatosPedidoRealtime(null);
          }, 15000);
        }
      } else {
        setPedidoActivoId(null);
        localStorage.removeItem(`ultimoPedido_${restauranteId}`);
      }
    });
    return () => unsub();
  }, [pedidoActivoId, restauranteId]);

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => [...prev, producto]);
    setAvisoAgregado(producto.nombre);
    setTimeout(() => setAvisoAgregado(null), 1500);
  };

  const total = carrito.reduce((acc, item) => acc + (Number(item.precio) || 0), 0);

  const enviarPedido = async (e) => {
    if (e) e.preventDefault();
    if (tipoPedido === 'mesa' && !nombre) return alert("Ingresa tu nombre");
    if (tipoPedido === 'delivery' && (!nombre || !telefono || !direccion)) return alert("Completa los datos");
    
    setEnviando(true);
    try {
      const nuevoPedido = {
        restauranteId, 
        cliente: { 
          nombre, 
          telefono: tipoPedido === 'mesa' ? 'En Local' : telefono, 
          direccion: tipoPedido === 'mesa' ? 'Atención en Local' : direccion,
          tipo: tipoPedido 
        },
        productos: carrito.map(p => ({ nombre: p.nombre, precio: p.precio })),
        total,
        estado: "pendiente",
        fecha: new Date()
      };

      const docRef = await addDoc(collection(db, "pedidos"), nuevoPedido);
      setPedidoActivoId(docRef.id);
      localStorage.setItem(`ultimoPedido_${restauranteId}`, docRef.id);

      setCarrito([]);
      setMostrarFormulario(false);
      setVerCarrito(false);
    } catch (error) {
      alert("Error al enviar el pedido.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="admin-container">
      {avisoAgregado && (
        <div className="toast-agregado">
          <CheckCircle size={18} /> {avisoAgregado} agregado
        </div>
      )}

      {/* BOTÓN FLOTANTE */}
      {carrito.length > 0 && !verCarrito && !mostrarFormulario && !pedidoActivoId && (
        <button className="btn-carrito-flotante" onClick={() => setVerCarrito(true)}>
          <ShoppingCart size={20} />
          <span>Ver Mi Orden (S/ {total.toFixed(2)})</span>
        </button>
      )}

      {/* SEGUIMIENTO DE PEDIDO */}
      {pedidoActivoId && datosPedidoRealtime && (
        <div className="view-principal" style={{padding: '20px'}}>
           <div className="msg-box" style={{maxWidth: '100%', border: '3px solid var(--primary)'}}>
              <h2 className="titulo-principal" style={{fontSize: '1.8rem'}}>¡Hola, {datosPedidoRealtime.cliente.nombre}!</h2>
              <p>Tu pedido está siendo procesado.</p>
              
              <div className="status-tracker">
                <div className="status-step" style={{color: 'var(--primary)', opacity: 1}}>
                  <Clock size={35} />
                  <p style={{fontSize: '0.7rem', fontWeight: '800'}}>RECIBIDO</p>
                </div>

                <div className="status-step" style={{
                  color: 'var(--warning)', 
                  opacity: (['preparando', 'enviado', 'entregado'].includes(datosPedidoRealtime.estado)) ? 1 : 0.2
                }}>
                  <ChefHat size={35} className={datosPedidoRealtime.estado === 'preparando' ? 'anim-pulse' : ''} />
                  <p style={{fontSize: '0.7rem', fontWeight: '800'}}>EN COCINA</p>
                </div>

                <div className="status-step" style={{
                  color: 'var(--success)', 
                  opacity: (['enviado', 'entregado'].includes(datosPedidoRealtime.estado)) ? 1 : 0.2
                }}>
                  <Truck size={35} className={datosPedidoRealtime.estado === 'enviado' ? 'anim-pulse' : ''} />
                  <p style={{fontSize: '0.7rem', fontWeight: '800'}}>EN CAMINO</p>
                </div>
              </div>

              <div className={`status-badge ${datosPedidoRealtime.estado}`} style={{fontSize: '1rem', padding: '10px 20px'}}>
                {datosPedidoRealtime.estado === 'pendiente' && "Esperando confirmación..."}
                {datosPedidoRealtime.estado === 'preparando' && "¡El chef está cocinando!"}
                {datosPedidoRealtime.estado === 'enviado' && "¡Tu pedido va hacia ti!"}
                {datosPedidoRealtime.estado === 'entregado' && "¡Pedido Entregado! Gracias."}
              </div>
           </div>
        </div>
      )}

      {/* MENU Y CATEGORIAS */}
      {!pedidoActivoId && (
        <>
          {!categoriaActual ? (
            <div className="view-principal">
              <div className="menu-principal-wrapper">
                <div className="header-brand">
                  <img src={logoRestaurante} alt="Logo Restaurante" className="img-tabla" style={{width: '80px', height: '80px', marginBottom: '10px', borderRadius: '50%'}} />
                  <h1 className="titulo-principal">¿Qué te apetece hoy?</h1>
                </div>
                <div className="categorias-grid-principal">
                  <div className="categoria-item" onClick={() => setCategoriaActual('Menu')}>
                    <div className="categoria-circulo bg-comidas"><Pizza size={90} className="icon-main" /></div>
                    <span className="categoria-label">Comidas</span>
                  </div>
                  <div className="categoria-item" onClick={() => setCategoriaActual('Cafeteria')}>
                    <div className="categoria-circulo bg-cafe"><Coffee size={90} className="icon-main" /></div>
                    <span className="categoria-label">Cafetería</span>
                  </div>
                  <div className="categoria-item" onClick={() => setCategoriaActual('Bebidas')}>
                    <div className="categoria-circulo bg-bebidas"><Droplet size={90} className="icon-main" /></div>
                    <span className="categoria-label">Bebidas</span>
                  </div>
                  <div className="categoria-item" onClick={() => setCategoriaActual('Entradas')}>
                    <div className="categoria-circulo bg-entradas"><Utensils size={90} className="icon-main" /></div>
                    <span className="categoria-label">Entradas</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="view-header" style={{display: 'flex', alignItems: 'center', gap: '15px', padding: '10px'}}>
                <button className="btn-back-inline" onClick={() => setCategoriaActual(null)}><ArrowLeft size={24} /></button>
                <h2 className="titulo-principal" style={{ fontSize: '1.8rem', margin: 0 }}>{categoriaActual}</h2>
              </div>
              <div className="productos-grid">
                {productos.map(p => (
                  <div key={p.id} className="producto-card">
                    <img src={p.img} alt={p.nombre} className="producto-foto" />
                    <div className="producto-info">
                      <h3 style={{fontSize: '1.1rem', marginBottom: '5px'}}>{p.nombre}</h3>
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

      {/* MODAL CARRITO */}
      {verCarrito && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2 className="titulo-principal">Tu Orden</h2>
            <div className="carrito-lista">
              {carrito.map((item, i) => (
                <div key={i} className="carrito-item-fila">
                  <span>{item.nombre}</span>
                  <strong>S/ {item.precio.toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <div className="carrito-total">Total: S/ {total.toFixed(2)}</div>
            <div className="modal-buttons">
              <button className="btn-no" onClick={() => setVerCarrito(false)}>Añadir más</button>
              <button className="btn-yes" style={{background: 'var(--success)'}} onClick={() => { setVerCarrito(false); setMostrarFormulario(true); }}>Pedir Ahora</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORMULARIO */}
      {mostrarFormulario && (
        <div className="overlay-msg">
          <div className="msg-box">
            <h2 className="titulo-principal">Datos de Entrega</h2>
            <div className="tipo-pedido-selector" style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
               <button className={`btn-tipo-selector ${tipoPedido === 'mesa' ? 'active' : ''}`} onClick={() => setTipoPedido('mesa')}>Local / Mesa</button>
               <button className={`btn-tipo-selector ${tipoPedido === 'delivery' ? 'active' : ''}`} onClick={() => setTipoPedido('delivery')}>Para Delivery</button>
            </div>
            <div className="login-form">
              <div className="input-group">
                <User className="input-icon" size={18} />
                <input type="text" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              {tipoPedido === 'delivery' && (
                <>
                  <div className="input-group">
                    <Phone className="input-icon" size={18} />
                    <input type="tel" placeholder="Celular" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <MapPin className="input-icon" size={18} />
                    <input type="text" placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                  </div>
                </>
              )}
              <div className="modal-buttons">
                <button className="btn-no" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
                <button className="btn-login-submit" onClick={enviarPedido} disabled={enviando}>{enviando ? "Enviando..." : "Confirmar Pedido"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCliente;