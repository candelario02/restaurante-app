import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Trash2, Power, PowerOff, ImageIcon, Save, UserPlus, Mail, Truck, ChefHat, CheckCircle } from 'lucide-react';

const Admin = ({ seccion }) => {
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('Menu');
  const [imagen, setImagen] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, 'productos'), s => setProductos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubUser = onSnapshot(collection(db, 'usuarios_admin'), s => setUsuarios(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPed = onSnapshot(collection(db, 'pedidos'), s => setPedidos(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.fecha?.seconds - a.fecha?.seconds)));
    return () => { unsubProd(); unsubUser(); unsubPed(); };
  }, []);

  const subirProducto = async (e) => {
    e.preventDefault();
    if (!imagen) return;
    setCargando(true);
    try {
      const storageRef = ref(storage, `productos/${Date.now()}`);
      await uploadBytes(storageRef, imagen);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'productos'), { nombre, precio: Number(precio), categoria, img: url, disponible: true });
      setNombre(''); setPrecio(''); setImagen(null);
    } catch (e) { alert("Error al subir"); } finally { setCargando(false); }
  };

  const registrarAdmin = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'usuarios_admin', userEmail), { email: userEmail, rol: 'admin' });
    setUserEmail('');
  };

  const cambiarEstado = async (id, estado) => { await updateDoc(doc(db, 'pedidos', id), { estado }); };

  return (
    <div className="admin-container">
      {/* SECCIÓN PRODUCTOS */}
      {seccion === 'menu' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <form onSubmit={subirProducto} className="login-form">
            <h2>Nuevo Producto</h2>
            <div className="input-group"><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre" required /></div>
            <div className="input-group"><input type="number" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Precio" required /></div>
            <select className="btn-top-gestion" value={categoria} onChange={e => setCategoria(e.target.value)} style={{width: '100%', marginBottom: '15px'}}>
              <option value="Menu">Comidas</option>
              <option value="Cafeteria">Cafetería</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Entradas">Entradas</option>
            </select>
            <label className="btn-top-login" style={{width: '100%', justifyContent: 'center', marginBottom: '15px'}}>
              <ImageIcon size={18}/> {imagen ? imagen.name : 'Imagen'}
              <input type="file" hidden onChange={e => setImagen(e.target.files[0])}/>
            </label>
            <button className="btn-login-submit" disabled={cargando} style={{width: '100%'}}>
              <Save size={18}/> {cargando ? '...' : 'Guardar'}
            </button>
          </form>

          <table className="tabla-admin">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.id}>
                  <td style={{fontWeight: '600'}}>{p.nombre}</td>
                  <td>S/ {p.precio.toFixed(2)}</td>
                  <td>
                    <button className="btn-back-inline" onClick={() => updateDoc(doc(db, 'productos', p.id), { disponible: !p.disponible })}>
                      {p.disponible ? <Power color="var(--success)"/> : <PowerOff color="var(--danger)"/>}
                    </button>
                  </td>
                  <td>
                    <button className="btn-back-inline" onClick={() => deleteDoc(doc(db, 'productos', p.id))}>
                      <Trash2 color="var(--danger)"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SECCIÓN USUARIOS */}
      {seccion === 'usuarios' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <form onSubmit={registrarAdmin} className="login-form">
            <h2>Registrar Admin</h2>
            <div className="input-group">
              <Mail className="input-icon"/>
              <input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="Email" required />
            </div>
            <button className="btn-login-submit" style={{width: '100%'}}><UserPlus size={18}/> Agregar</button>
          </form>
          <table className="tabla-admin">
            <thead><tr><th>Email</th><th>Eliminar</th></tr></thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    <button className="btn-back-inline" onClick={() => deleteDoc(doc(db, 'usuarios_admin', u.id))}>
                      <Trash2 color="var(--danger)"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SECCIÓN PEDIDOS */}
      {seccion === 'pedidos' && (
        <div className="productos-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {pedidos.map(p => (
            <div key={p.id} className="producto-card">
              <div className="msg-box" style={{boxShadow: 'none', border: 'none', padding: '10px'}}>
                <h3 style={{margin: '0 0 5px 0'}}>{p.cliente.nombre}</h3>
                <p className="text-muted" style={{fontSize: '0.9rem'}}>{p.cliente.direccion}</p>
                <div className="precio-tag">Total: S/ {p.total.toFixed(2)}</div>
                <p style={{marginTop: '10px'}}>Estado: <strong>{p.estado}</strong></p>
                <div className="modal-buttons" style={{marginTop: '15px'}}>
                  <button className="btn-no" onClick={() => cambiarEstado(p.id, 'preparando')} title="Cocina"><ChefHat size={16}/></button>
                  <button className="btn-no" onClick={() => cambiarEstado(p.id, 'enviado')} title="Ruta"><Truck size={16}/></button>
                  <button className="btn-yes" style={{background: 'var(--success)'}} onClick={() => cambiarEstado(p.id, 'entregado')} title="OK"><CheckCircle size={16}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default Admin;