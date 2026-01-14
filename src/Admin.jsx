import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // Quitamos 'storage' porque ya no lo usaremos
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
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

  // --- NUEVA FUNCIÓN PARA CLOUDINARY ---
  const subirACloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'restaurante_preset'); // Tu preset sin punto

    const resp = await fetch('https://api.cloudinary.com/v1_1/drkrsfxlc/image/upload', {
      method: 'POST',
      body: formData
    });

    if (!resp.ok) throw new Error('Error al subir a Cloudinary');
    const data = await resp.json();
    return data.secure_url; 
  };

  const subirProducto = async (e) => {
    e.preventDefault();
    if (!imagen) {
      alert("Por favor selecciona una imagen");
      return;
    }
    
    setCargando(true);
    
    try {
      // 1. Subir imagen a Cloudinary (Rápido y gratis)
      const urlImagenCloudinary = await subirACloudinary(imagen);

      // 2. Guardar datos en Firestore (Usando la URL de Cloudinary)
      await addDoc(collection(db, 'productos'), { 
        nombre, 
        precio: Number(precio), 
        categoria, 
        img: urlImagenCloudinary, // Guardamos el link directo
        disponible: true 
      });

      // 3. Limpiar formulario
      setNombre(''); 
      setPrecio(''); 
      setImagen(null);
      alert("¡Producto guardado con éxito en Cloudinary!");
    } catch (e) { 
      console.error(e);
      alert("Error: " + e.message); 
    } finally { 
      setCargando(false); 
    }
  };

  const registrarAdmin = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'usuarios_admin', userEmail), { email: userEmail, rol: 'admin' });
      setUserEmail('');
      alert("Administrador registrado");
    } catch (error) {
      alert("Error al registrar");
    }
  };

  const cambiarEstado = async (id, estado) => { 
    await updateDoc(doc(db, 'pedidos', id), { estado }); 
  };

  return (
    <div className="admin-container">
      {/* SECCIÓN PRODUCTOS */}
      {seccion === 'menu' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <form onSubmit={subirProducto} className="login-form">
            <h2 style={{textAlign: 'center', marginBottom: '20px'}}>Nuevo Producto</h2>
            <div className="input-group"><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del plato" required /></div>
            <div className="input-group"><input type="number" step="0.1" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Precio (S/)" required /></div>
            
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666'}}>Categoría:</label>
              <select className="btn-top-gestion" value={categoria} onChange={e => setCategoria(e.target.value)} style={{width: '100%'}}>
                <option value="Menu">Comidas</option>
                <option value="Cafeteria">Cafetería</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Entradas">Entradas</option>
              </select>
            </div>

            <label className="btn-top-login" style={{width: '100%', justifyContent: 'center', marginBottom: '15px', cursor: 'pointer'}}>
              <ImageIcon size={18} style={{marginRight: '10px'}}/> {imagen ? imagen.name : 'Seleccionar Imagen'}
              <input type="file" hidden accept="image/*" onChange={e => setImagen(e.target.files[0])}/>
            </label>

            <button 
              className={`btn-login-submit ${cargando ? 'btn-loading' : ''}`} 
              disabled={cargando} 
              style={{ width: '100%', position: 'relative' }}
            >
              {cargando ? (
                <div className="spinner-loader"></div>
              ) : (
                <>
                  <Save size={18} style={{ marginRight: '10px' }} /> 
                  Guardar Producto
                </>
              )}
            </button>
          </form>

          <div style={{marginTop: '40px', overflowX: 'auto'}}>
            <table className="tabla-admin">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id}>
                    <td><img src={p.img} alt={p.nombre} style={{width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover'}} /></td>
                    <td style={{fontWeight: '600'}}>{p.nombre}</td>
                    <td>S/ {p.precio.toFixed(2)}</td>
                    <td>
                      <button className="btn-back-inline" onClick={() => updateDoc(doc(db, 'productos', p.id), { disponible: !p.disponible })}>
                        {p.disponible ? <Power color="#22c55e"/> : <PowerOff color="#ef4444"/>}
                      </button>
                    </td>
                    <td>
                      <button className="btn-back-inline" onClick={() => { if(window.confirm('¿Eliminar?')) deleteDoc(doc(db, 'productos', p.id)) }}>
                        <Trash2 color="#ef4444"/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECCIÓN USUARIOS */}
      {seccion === 'usuarios' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <form onSubmit={registrarAdmin} className="login-form">
            <h2>Registrar Admin</h2>
            <div className="input-group">
              <Mail className="input-icon"/>
              <input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="Email del nuevo administrador" required />
            </div>
            <button className="btn-login-submit" style={{width: '100%'}}><UserPlus size={18}/> Agregar Acceso</button>
          </form>
          <table className="tabla-admin">
            <thead><tr><th>Email</th><th>Eliminar</th></tr></thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    <button className="btn-back-inline" onClick={() => deleteDoc(doc(db, 'usuarios_admin', u.id))}>
                      <Trash2 color="#ef4444"/>
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
          {pedidos.length === 0 ? <p style={{textAlign: 'center', width: '100%'}}>No hay pedidos pendientes</p> : 
          pedidos.map(p => (
            <div key={p.id} className="producto-card">
              <div className="msg-box" style={{boxShadow: 'none', border: 'none', padding: '10px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <h3 style={{margin: '0 0 5px 0'}}>{p.cliente.nombre}</h3>
                    <span style={{fontSize: '0.8rem', color: '#888'}}>{p.fecha?.toDate().toLocaleTimeString()}</span>
                </div>
                <p className="text-muted" style={{fontSize: '0.9rem'}}>{p.cliente.direccion}</p>
                <div className="precio-tag">Total: S/ {p.total.toFixed(2)}</div>
                
                <div style={{margin: '10px 0', fontSize: '0.85rem', background: '#f9f9f9', padding: '5px', borderRadius: '5px'}}>
                    <strong>Detalle:</strong>
                    {p.productos.map((prod, idx) => (
                        <div key={idx}>- {prod.nombre} (S/ {prod.precio})</div>
                    ))}
                </div>

                <p>Estado: <span className={`badge-${p.estado}`} style={{textTransform: 'uppercase', fontWeight: 'bold'}}>{p.estado}</span></p>
                <div className="modal-buttons" style={{marginTop: '15px'}}>
                  <button className="btn-no" onClick={() => cambiarEstado(p.id, 'preparando')} title="Cocina"><ChefHat size={16}/></button>
                  <button className="btn-no" onClick={() => cambiarEstado(p.id, 'enviado')} title="Ruta"><Truck size={16}/></button>
                  <button className="btn-yes" style={{background: '#22c55e', color: 'white'}} onClick={() => cambiarEstado(p.id, 'entregado')} title="OK"><CheckCircle size={16}/></button>
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
