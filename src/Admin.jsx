import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Trash2, Power, PowerOff, ImageIcon, Save, UserPlus, Mail, Truck, ChefHat, CheckCircle, Edit, X } from 'lucide-react';

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

  const cambiarEstado = async (id, estado) => {
    await updateDoc(doc(db, 'pedidos', id), { estado });
    mostrarSms(`Pedido: ${estado}`, "exito");
  };

  return (
    <div className="admin-container">
      {/* Alertas usando tu clase overlay-msg y animaciones */}
      {notificacion.texto && (
        <div className="overlay-msg">
          <div className={`mensaje-alerta ${notificacion.tipo}`}>
            {notificacion.texto}
          </div>
        </div>
      )}

      {seccion === 'menu' && (
        <div className="menu-principal-wrapper">
          <form onSubmit={guardarProducto} className="login-form" style={{maxWidth: '500px', margin: '0 auto'}}>
            <h2 className="titulo-principal" style={{fontSize: '2rem'}}>{editandoId ? 'Editar Plato' : 'Nuevo Plato'}</h2>
            
            <div className="input-group">
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del plato" required />
            </div>
            
            <div className="input-group">
              <input type="number" step="0.1" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Precio (S/)" required />
            </div>

            <div className="input-group">
              <select className="btn-top-gestion" value={categoria} onChange={e => setCategoria(e.target.value)} style={{width: '100%', paddingLeft: '15px', border: '2px solid var(--border)'}}>
                <option value="Menu">Comidas</option>
                <option value="Cafeteria">Cafetería</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Entradas">Entradas</option>
              </select>
            </div>

            <label className="btn-top-login" style={{cursor: 'pointer', justifyContent: 'center', background: '#f1f5f9'}}>
              <ImageIcon size={18} /> 
              <span style={{marginLeft: '10px'}}>{imagen ? imagen.name : (editandoId ? 'Cambiar Imagen' : 'Subir Imagen')}</span>
              <input type="file" hidden accept="image/*" onChange={e => setImagen(e.target.files[0])}/>
            </label>

            <div className="modal-buttons">
              {editandoId && <button type="button" className="btn-no" onClick={cancelarEdicion}>Cancelar</button>}
              <button className={`btn-login-submit ${cargando ? 'btn-loading' : ''}`} disabled={cargando}>
                {cargando ? <div className="spinner-loader"></div> : <><Save size={18}/> {editandoId ? 'Actualizar' : 'Guardar'}</>}
              </button>
            </div>
          </form>

          <div style={{marginTop: '40px', overflowX: 'auto'}}>
            <table className="tabla-admin">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Plato</th>
                  <th>Precio</th>
                  <th>Disp.</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id}>
                    <td><img src={p.img} alt={p.nombre} style={{width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover'}} /></td>
                    <td style={{fontWeight: '600'}}>{p.nombre}</td>
                    <td>S/ {p.precio.toFixed(2)}</td>
                    <td>
                      <button className="btn-back-inline" onClick={() => updateDoc(doc(db, 'productos', p.id), { disponible: !p.disponible })}>
                        {p.disponible ? <Power color="var(--success)" size={18}/> : <PowerOff color="var(--danger)" size={18}/>}
                      </button>
                    </td>
                    <td>
                      <div style={{display: 'flex', gap: '5px'}}>
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
        <div className="menu-principal-wrapper" style={{maxWidth: '600px', margin: '0 auto'}}>
          <form onSubmit={registrarAdmin} className="login-form">
            <h2 className="titulo-principal" style={{fontSize: '2rem'}}>Accesos Admin</h2>
            <div className="input-group">
              <Mail className="input-icon"/><input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="Correo electrónico" required />
            </div>
            <button className="btn-login-submit"><UserPlus size={18}/> Dar Acceso</button>
          </form>
          
          <table className="tabla-admin" style={{marginTop: '30px'}}>
            <thead><tr><th>Email</th><th>Acción</th></tr></thead>
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
      )}

      {seccion === 'pedidos' && (
        <div className="productos-grid">
          {pedidos.length === 0 ? <p style={{gridColumn: '1/-1', textAlign: 'center'}} className="text-muted">No hay pedidos pendientes</p> : 
          pedidos.map(p => (
            <div key={p.id} className="producto-card" style={{padding: '20px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                <h3 style={{margin: 0}}>{p.cliente.nombre}</h3>
                <span className="text-muted" style={{fontSize: '0.8rem'}}>{p.fecha?.toDate().toLocaleTimeString()}</span>
              </div>
              <p className="text-muted" style={{fontSize: '0.85rem', marginBottom: '15px'}}>{p.cliente.direccion}</p>
              
              <div style={{margin: '15px 0', padding: '12px', background: 'var(--bg-body)', borderRadius: '10px', border: '1px solid var(--border)'}}>
                {p.productos.map((prod, idx) => (
                  <div key={idx} style={{fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                    <span>{prod.nombre}</span>
                    <span style={{fontWeight: '600'}}>S/ {prod.precio.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{marginTop: '10px', borderTop: '1px dashed var(--border)', paddingTop: '8px', fontWeight: '800', textAlign: 'right', color: 'var(--primary)', fontSize: '1.1rem'}}>
                  Total: S/ {p.total.toFixed(2)}
                </div>
              </div>

              <div style={{marginBottom: '15px'}}>
                <span style={{
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '0.75rem', 
                  fontWeight: '700', 
                  textTransform: 'uppercase',
                  background: p.estado === 'entregado' ? '#dcfce7' : '#fef9c3',
                  color: p.estado === 'entregado' ? '#166534' : '#854d0e'
                }}>
                  {p.estado}
                </span>
              </div>

              <div className="modal-buttons">
                <button className="btn-no" title="Cocina" onClick={() => cambiarEstado(p.id, 'preparando')}><ChefHat size={18}/></button>
                <button className="btn-no" title="Delivery" onClick={() => cambiarEstado(p.id, 'enviado')}><Truck size={18}/></button>
                <button className="btn-yes" style={{background: 'var(--success)'}} title="Listo" onClick={() => cambiarEstado(p.id, 'entregado')}><CheckCircle size={18}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Admin;