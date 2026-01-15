import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { 
  Trash2, Power, PowerOff, ImageIcon, Save, 
  UserPlus, Mail, Truck, ChefHat, CheckCircle, Edit, Phone, Calendar, Eye, EyeOff
} from 'lucide-react';

const Admin = ({ seccion }) => {
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  
  // Estados para Nuevo/Editar Producto
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('Menu');
  const [imagen, setImagen] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  
  const [cargando, setCargando] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [notificacion, setNotificacion] = useState({ texto: '', tipo: '' });

  // Estados para Contabilidad e Historial
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [pedidoExpandido, setPedidoExpandido] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubProd = onSnapshot(collection(db, 'productos'), (s) => 
      setProductos(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubUser = onSnapshot(collection(db, 'usuarios_admin'), (s) => 
      setUsuarios(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubPed = onSnapshot(collection(db, 'pedidos'), (s) => {
      const docs = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setPedidos(docs.sort((a,b) => b.fecha?.seconds - a.fecha?.seconds));
    });

    return () => { unsubProd(); unsubUser(); unsubPed(); };
  }, []);

  const mostrarSms = (texto, tipo) => {
    setNotificacion({ texto, tipo });
    setTimeout(() => setNotificacion({ texto: '', tipo: '' }), 3000);
  };

  const subirACloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'restaurante_preset');
    const resp = await fetch('https://api.cloudinary.com/v1_1/drkrsfxlc/image/upload', {
      method: 'POST',
      body: formData
    });
    if (!resp.ok) throw new Error('Error al subir imagen');
    const data = await resp.json();
    return data.secure_url;
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      let urlImagen = imagen ? await subirACloudinary(imagen) : null;
      const datos = { nombre, precio: Number(precio), categoria, disponible: true };
      if (urlImagen) datos.img = urlImagen;

      if (editandoId) {
        await updateDoc(doc(db, 'productos', editandoId), datos);
        mostrarSms("Producto actualizado", "exito");
      } else {
        if (!urlImagen) throw new Error("Imagen requerida");
        await addDoc(collection(db, 'productos'), { ...datos, img: urlImagen });
        mostrarSms("Producto creado", "exito");
      }
      cancelarEdicion();
    } catch (err) {
      mostrarSms(err.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const prepararEdicion = (p) => {
    setEditandoId(p.id);
    setNombre(p.nombre);
    setPrecio(p.precio);
    setCategoria(p.categoria);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setNombre(''); setPrecio(''); setImagen(null);
  };

  const registrarAdmin = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'usuarios_admin', userEmail), { email: userEmail, rol: 'admin' });
      setUserEmail('');
      mostrarSms("Acceso concedido", "exito");
    } catch (e) { mostrarSms("Error de permisos", "error"); }
  };

  const cambiarEstado = async (id, nuevoEstado, estadoActual) => {
    if (estadoActual === 'entregado') return;

    // VALIDACIÓN DE FLUJO: No dejar entregar si no se ha preparado o enviado antes
    if (nuevoEstado === 'entregado' && (estadoActual !== 'preparando' && estadoActual !== 'enviado')) {
      mostrarSms("Primero debe pasar por cocina o delivery", "error");
      return;
    }

    if (estadoActual === nuevoEstado) {
      mostrarSms(`Ya está en: ${nuevoEstado}`, "error");
      return;
    }

    await updateDoc(doc(db, 'pedidos', id), { estado: nuevoEstado });
    mostrarSms(`Pedido: ${nuevoEstado}`, "exito");
  };

  // --- LÓGICA DE FILTROS Y CONTABILIDAD ---
  const pedidosActivos = pedidos.filter(p => (p.estado || 'pendiente') !== 'entregado');
  
  const historialFiltrado = pedidos.filter(p => {
    if (!p.fecha) return false;
    const fechaPedido = p.fecha.toDate().toISOString().split('T')[0];
    return p.estado === 'entregado' && fechaPedido === fechaFiltro;
  });

  const totalDia = historialFiltrado.reduce((acc, p) => acc + (p.total || 0), 0);

  const totalMes = pedidos.filter(p => {
    if (!p.fecha || p.estado !== 'entregado') return false;
    const date = p.fecha.toDate();
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((acc, p) => acc + (p.total || 0), 0);

  return (
    <div className="admin-container">
      {notificacion.texto && (
        <div className="overlay-msg">
          <div className={`mensaje-alerta ${notificacion.tipo}`}>
            {notificacion.texto}
          </div>
        </div>
      )}

      {seccion === 'menu' && (
        <div className="menu-principal-wrapper">
          <form onSubmit={guardarProducto} className="login-form">
            <h2 className="titulo-principal">{editandoId ? 'Editar Plato' : 'Nuevo Plato'}</h2>
            <div className="input-group">
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del plato" required />
            </div>
            <div className="input-group">
              <input type="number" step="0.1" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Precio (S/)" required />
            </div>
            <div className="input-group">
              <select className="btn-top-gestion" value={categoria} onChange={e => setCategoria(e.target.value)}>
                <option value="Menu">Comidas</option>
                <option value="Cafeteria">Cafetería</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Entradas">Entradas</option>
              </select>
            </div>
            <label className="btn-top-login">
              <ImageIcon size={18} /> 
              <span>{imagen ? imagen.name : (editandoId ? 'Cambiar Imagen' : 'Subir Imagen')}</span>
              <input type="file" hidden accept="image/*" onChange={e => setImagen(e.target.files[0])}/>
            </label>
            <div className="modal-buttons">
              {editandoId && <button type="button" className="btn-no" onClick={cancelarEdicion}>Cancelar</button>}
              <button className={`btn-login-submit ${cargando ? 'btn-loading' : ''}`} disabled={cargando}>
                {cargando ? <div className="spinner-loader"></div> : <><Save size={18}/> {editandoId ? 'Actualizar' : 'Guardar'}</>}
              </button>
            </div>
          </form>

          <div className="tabla-admin-container">
            <table className="tabla-admin">
              <thead><tr><th>Plato</th><th>Precio</th><th>Disp.</th><th>Acciones</th></tr></thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id}>
                    <td><div className="categoria-item-mini"><img src={p.img} alt="" className="img-tabla" /><span>{p.nombre}</span></div></td>
                    <td>S/ {p.precio.toFixed(2)}</td>
                    <td><button className="btn-back-inline" onClick={() => updateDoc(doc(db, 'productos', p.id), { disponible: !p.disponible })}>{p.disponible ? <Power color="var(--success)" size={18}/> : <PowerOff color="var(--danger)" size={18}/>}</button></td>
                    <td><div className="admin-buttons-acciones"><button className="btn-back-inline" onClick={() => prepararEdicion(p)}><Edit size={16}/></button><button className="btn-back-inline" onClick={() => window.confirm('¿Eliminar?') && deleteDoc(doc(db, 'productos', p.id))}><Trash2 color="var(--danger)" size={16}/></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {seccion === 'usuarios' && (
        <div className="menu-principal-wrapper">
          <form onSubmit={registrarAdmin} className="login-form">
            <h2 className="titulo-principal">Accesos Admin</h2>
            <div className="input-group">
              <Mail className="input-icon"/><input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="Correo electrónico" required />
            </div>
            <button className="btn-login-submit"><UserPlus size={18}/> Dar Acceso</button>
          </form>
          <div className="tabla-admin-container">
            <table className="tabla-admin">
              <thead><tr><th>Email</th><th>Quitar</th></tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}><td>{u.email}</td><td><button className="btn-back-inline" onClick={() => deleteDoc(doc(db, 'usuarios_admin', u.id))}><Trash2 color="var(--danger)" size={18}/></button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {seccion === 'pedidos' && (
        <div className="pedidos-seccion-wrapper">
          {/* --- BLOQUE CONTABILIDAD --- */}
          <div className="contabilidad-resumen" style={{display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap'}}>
            <div className="card-stat" style={{flex: 1, minWidth: '200px', background: 'var(--bg-card)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)'}}>
              <p className="text-muted">Vendido Hoy</p>
              <h2 style={{color: 'var(--success)'}}>S/ {totalDia.toFixed(2)}</h2>
            </div>
            <div className="card-stat" style={{flex: 1, minWidth: '200px', background: 'var(--bg-card)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)'}}>
              <p className="text-muted">Total del Mes</p>
              <h2 style={{color: 'var(--primary)'}}>S/ {totalMes.toFixed(2)}</h2>
            </div>
          </div>

          <h2 className="titulo-principal" style={{fontSize: '1.5rem', marginBottom: '20px'}}>Pendientes ({pedidosActivos.length})</h2>
          
          <div className="productos-grid">
            {pedidosActivos.map(p => (
              <div key={p.id} className="producto-card-pedido">
                <div className="pedido-header">
                  <h3>{p.cliente.nombre}</h3>
                  <span className="text-muted">{p.fecha?.toDate().toLocaleTimeString()}</span>
                </div>
                <p className="text-muted" style={{display: 'flex', alignItems: 'center', gap: '5px'}}><Truck size={14}/> {p.cliente.direccion}</p>
                <p className="text-muted" style={{display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold'}}><Phone size={14}/> {p.cliente.telefono}</p>
                
                <div className="pedido-lista-productos">
                  {p.productos.map((prod, idx) => (
                    <div key={idx} className="pedido-item-row"><span>{prod.nombre}</span><span className="bold">S/ {prod.precio.toFixed(2)}</span></div>
                  ))}
                  <div className="pedido-total-row">Total: S/ {p.total.toFixed(2)}</div>
                </div>

                <div className="pedido-status-container">
                  <span className={`status-badge ${p.estado || 'pendiente'}`}>{p.estado || 'pendiente'}</span>
                </div>

                <div className="modal-buttons">
                  <button className={`btn-no ${p.estado === 'preparando' ? 'btn-active' : ''}`} onClick={() => cambiarEstado(p.id, 'preparando', p.estado)}><ChefHat size={18}/></button>
                  <button className={`btn-no ${p.estado === 'enviado' ? 'btn-active' : ''}`} onClick={() => cambiarEstado(p.id, 'enviado', p.estado)}><Truck size={18}/></button>
                  <button 
                    className={`btn-yes-success ${(p.estado !== 'preparando' && p.estado !== 'enviado') ? 'btn-disabled' : ''}`} 
                    onClick={() => cambiarEstado(p.id, 'entregado', p.estado)}
                  >
                    <CheckCircle size={18}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* --- SECCIÓN HISTORIAL CON CALENDARIO --- */}
          <div className="historial-header" style={{marginTop: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px'}}>
            <h2 className="titulo-principal" style={{fontSize: '1.5rem', color: 'var(--text-muted)'}}>Historial</h2>
            <div className="input-group" style={{width: 'auto'}}>
              <Calendar size={18} style={{marginRight: '10px'}}/>
              <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} style={{padding: '5px', borderRadius: '8px', border: '1px solid var(--border)'}}/>
            </div>
          </div>

          <div className="productos-grid" style={{marginTop: '20px'}}>
            {historialFiltrado.length === 0 ? (
              <p className="text-muted" style={{gridColumn: '1/-1', textAlign: 'center'}}>No hay entregas en esta fecha</p>
            ) : (
              historialFiltrado.map(p => (
                <div key={p.id} className="producto-card-pedido" style={{opacity: 0.85, borderLeft: '5px solid var(--success)'}}>
                  <div className="pedido-header">
                    <h3>{p.cliente.nombre}</h3>
                    <button className="btn-back-inline" onClick={() => setPedidoExpandido(pedidoExpandido === p.id ? null : p.id)}>
                      {pedidoExpandido === p.id ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                  <p className="text-muted">{p.fecha?.toDate().toLocaleTimeString()} - {p.cliente.telefono}</p>
                  
                  {pedidoExpandido === p.id && (
                    <div className="pedido-lista-productos" style={{marginTop: '10px', background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '10px'}}>
                      {p.productos.map((prod, idx) => (
                        <div key={idx} className="pedido-item-row"><span>{prod.nombre}</span><span>S/ {prod.precio.toFixed(2)}</span></div>
                      ))}
                    </div>
                  )}
                  <div className="pedido-total-row" style={{marginTop: '10px'}}>Finalizado: S/ {p.total.toFixed(2)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;