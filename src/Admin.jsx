import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { 
  Trash2, Power, PowerOff, ImageIcon, Save, 
  UserPlus, Mail, Truck, ChefHat, CheckCircle, Edit, Phone 
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
      
      const datos = {
        nombre,
        precio: Number(precio),
        categoria,
        disponible: true
      };
      if (urlImagen) datos.img = urlImagen;

      if (editandoId) {
        await updateDoc(doc(db, 'productos', editandoId), datos);
        mostrarSms("Producto actualizado", "exito");
      } else {
        if (!urlImagen) throw new Error("Imagen requerida para nuevos productos");
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
    if (estadoActual === 'entregado') {
      mostrarSms("Este pedido ya fue finalizado", "error");
      return;
    }
    if (estadoActual === nuevoEstado) {
      mostrarSms(`El pedido ya está en: ${nuevoEstado}`, "error");
      return;
    }

    await updateDoc(doc(db, 'pedidos', id), { estado: nuevoEstado });
    mostrarSms(`Pedido: ${nuevoEstado}`, "exito");
  };

  // Filtrar pedidos
  const pedidosActivos = pedidos.filter(p => (p.estado || 'pendiente') !== 'entregado');
  const pedidosHistorial = pedidos.filter(p => p.estado === 'entregado');

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
              <thead>
                <tr>
                  <th>Plato</th><th>Precio</th><th>Disp.</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="categoria-item-mini">
                        <img src={p.img} alt="" className="img-tabla" />
                        <span>{p.nombre}</span>
                      </div>
                    </td>
                    <td>S/ {p.precio.toFixed(2)}</td>
                    <td>
                      <button className="btn-back-inline" onClick={() => updateDoc(doc(db, 'productos', p.id), { disponible: !p.disponible })}>
                        {p.disponible ? <Power color="var(--success)" size={18}/> : <PowerOff color="var(--danger)" size={18}/>}
                      </button>
                    </td>
                    <td>
                      <div className="admin-buttons-acciones">
                        <button className="btn-back-inline" onClick={() => prepararEdicion(p)}><Edit size={16}/></button>
                        <button className="btn-back-inline" onClick={() => window.confirm('¿Eliminar?') && deleteDoc(doc(db, 'productos', p.id))}><Trash2 color="var(--danger)" size={16}/></button>
                      </div>
                    </td>
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
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td><button className="btn-back-inline" onClick={() => deleteDoc(doc(db, 'usuarios_admin', u.id))}><Trash2 color="var(--danger)" size={18}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {seccion === 'pedidos' && (
        <div className="pedidos-seccion-wrapper">
          <h2 className="titulo-principal" style={{fontSize: '1.5rem', marginBottom: '20px'}}>Pendientes ({pedidosActivos.length})</h2>
          <div className="productos-grid">
            {pedidosActivos.length === 0 ? (
              <p className="text-muted" style={{gridColumn: '1/-1', textAlign: 'center'}}>No hay pedidos activos</p>
            ) : (
              pedidosActivos.map(p => (
                <div key={p.id} className="producto-card-pedido">
                  <div className="pedido-header">
                    <h3>{p.cliente.nombre}</h3>
                    <span className="text-muted">{p.fecha?.toDate().toLocaleTimeString()}</span>
                  </div>
                  <p className="text-muted" style={{display: 'flex', alignItems: 'center', gap: '5px', margin: '5px 0'}}>
                    <Truck size={14}/> {p.cliente.direccion}
                  </p>
                  <p className="text-muted" style={{display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600', color: 'var(--primary)'}}>
                    <Phone size={14}/> {p.cliente.telefono}
                  </p>
                  
                  <div className="pedido-lista-productos">
                    {p.productos.map((prod, idx) => (
                      <div key={idx} className="pedido-item-row">
                        <span>{prod.nombre}</span>
                        <span className="bold">S/ {prod.precio.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pedido-total-row">Total: S/ {p.total.toFixed(2)}</div>
                  </div>

                  <div className="pedido-status-container">
                    <span className={`status-badge ${p.estado || 'pendiente'}`}>
                      {p.estado || 'pendiente'}
                    </span>
                  </div>

                  <div className="modal-buttons">
                    <button 
                      className={`btn-no ${p.estado === 'preparando' ? 'btn-disabled' : ''}`} 
                      onClick={() => cambiarEstado(p.id, 'preparando', p.estado)}
                    >
                      <ChefHat size={18}/>
                    </button>
                    <button 
                      className={`btn-no ${p.estado === 'enviado' ? 'btn-disabled' : ''}`} 
                      onClick={() => cambiarEstado(p.id, 'enviado', p.estado)}
                    >
                      <Truck size={18}/>
                    </button>
                    <button 
                      className="btn-yes-success" 
                      onClick={() => cambiarEstado(p.id, 'entregado', p.estado)}
                    >
                      <CheckCircle size={18}/>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <hr style={{margin: '40px 0', border: 'none', borderTop: '1px solid var(--border)'}} />
          
          <h2 className="titulo-principal" style={{fontSize: '1.5rem', marginBottom: '20px', color: 'var(--text-muted)'}}>Historial de Hoy ({pedidosHistorial.length})</h2>
          <div className="productos-grid" style={{opacity: 0.7}}>
            {pedidosHistorial.map(p => (
              <div key={p.id} className="producto-card-pedido status-entregado-card">
                <div className="pedido-header">
                  <h3>{p.cliente.nombre}</h3>
                  <CheckCircle size={16} color="var(--success)"/>
                </div>
                <p className="text-muted">{p.cliente.telefono}</p>
                <div className="pedido-total-row" style={{marginTop: '10px'}}>Finalizado: S/ {p.total.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;