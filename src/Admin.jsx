import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Trash2,
  Power,
  PowerOff,
  Image as ImageIcon,
  Save,
  UserPlus,
  Mail,
  Truck,
  ChefHat,
  CheckCircle,
  Package
} from 'lucide-react';

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

  // 🔥 Listeners en tiempo real (Firebase)
  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, 'productos'), snap => {
      setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubUser = onSnapshot(collection(db, 'usuarios_admin'), snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPedidos = onSnapshot(collection(db, 'pedidos'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPedidos(data.sort((a, b) => b.fecha?.seconds - a.fecha?.seconds));
    });

    return () => {
      unsubProd();
      unsubUser();
      unsubPedidos();
    };
  }, []);

  // 🍔 Lógica de productos
  const subirProducto = async (e) => {
    e.preventDefault();
    if (!imagen) { alert('Selecciona una imagen'); return; }
    setCargando(true);
    try {
      const storageRef = ref(storage, `productos/${Date.now()}_${imagen.name}`);
      await uploadBytes(storageRef, imagen);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'productos'), {
        nombre,
        precio: Number(precio),
        categoria,
        img: url,
        disponible: true,
        creado: new Date()
      });
      setNombre(''); setPrecio(''); setCategoria('Menu'); setImagen(null);
    } catch (error) {
      console.error(error);
      alert('Error al subir el producto');
    } finally {
      setCargando(false);
    }
  };

  // 👤 Lógica de administradores
  const registrarAdmin = async (e) => {
    e.preventDefault();
    if (!userEmail) return;
    try {
      await setDoc(doc(db, 'usuarios_admin', userEmail), {
        email: userEmail,
        rol: 'admin',
        creado: new Date()
      });
      setUserEmail('');
      alert('Admin agregado');
    } catch (error) {
      console.error(error);
      alert('Error al registrar admin');
    }
  };

  const cambiarEstado = async (id, estado) => {
    await updateDoc(doc(db, 'pedidos', id), { estado });
  };

  return (
    <div className="admin-container">
      
      {/* ----------- SESIÓN: GESTIÓN DE MENÚ ----------- */}
      {seccion === 'menu' && (
        <>
          <div className="header-brand">
            <h2>Gestión de Menú</h2>
            <p>Agrega productos a la carta</p>
          </div>

          <form onSubmit={subirProducto} className="login-form">
            <div className="input-group">
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del plato" required />
            </div>
            <div className="input-group">
              <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Precio (S/)" required />
            </div>
            <div className="input-group">
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="btn-top-login">
                <option value="Menu">Comidas</option>
                <option value="Cafeteria">Cafetería</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Entradas">Entradas</option>
              </select>
            </div>
            <label className="btn-top-login">
              <ImageIcon size={20} /> {imagen ? imagen.name : 'Subir Imagen'}
              <input type="file" accept="image/*" hidden onChange={e => setImagen(e.target.files[0])} />
            </label>
            <button className="btn-login-submit" disabled={cargando}>
              <Save size={20} /> {cargando ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </form>

          <table className="tabla-admin">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <tr key={p.id}>
                  <td><img src={p.img} alt="" className="categoria-circulo" style={{width: '50px', height: '50px'}} /></td>
                  <td><strong>{p.nombre}</strong></td>
                  <td>S/ {p.precio.toFixed(2)}</td>
                  <td>
                    <div className="admin-buttons">
                      <button className="btn-back-inline" onClick={() => updateDoc(doc(db, 'productos', p.id), { disponible: !p.disponible })}>
                        {p.disponible ? <Power /> : <PowerOff />}
                      </button>
                      <button className="btn-back-inline" onClick={() => deleteDoc(doc(db, 'productos', p.id))}>
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ----------- SESIÓN: ADMINISTRADORES ----------- */}
      {seccion === 'usuarios' && (
        <>
          <div className="header-brand">
            <h2>Administradores</h2>
          </div>

          <form onSubmit={registrarAdmin} className="login-form">
            <div className="input-group">
              <Mail className="input-icon" size={18} />
              <input type="email" placeholder="Correo del nuevo admin" value={userEmail} onChange={e => setUserEmail(e.target.value)} required />
            </div>
            <button className="btn-top-gestion active">Agregar Admin</button>
          </form>

          <table className="tabla-admin">
            <thead>
              <tr>
                <th>Correo Electrónico</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    <button className="btn-back-inline" onClick={() => deleteDoc(doc(db, 'usuarios_admin', u.id))}>
                      <Trash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ----------- SESIÓN: PEDIDOS ----------- */}
      {seccion === 'pedidos' && (
        <>
          <div className="header-brand">
            <h2>Pedidos Recibidos</h2>
          </div>

          <div className="productos-grid">
            {pedidos.map(p => (
              <div key={p.id} className="producto-card">
                <div className="producto-info">
                  <h3>{p.cliente.nombre}</h3>
                  <p>{p.cliente.direccion}</p>
                  <hr />
                  {p.productos.map((prod, i) => (
                    <div key={i}>• {prod.nombre}</div>
                  ))}
                  <div className="precio-tag">Total: S/ {p.total.toFixed(2)}</div>
                  <div className="modal-buttons">
                    <button onClick={() => cambiarEstado(p.id, 'preparando')} className="btn-no">Cocina</button>
                    <button onClick={() => cambiarEstado(p.id, 'entregado')} className="btn-yes">Entregado</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Admin;