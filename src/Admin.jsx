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
  CheckCircle
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

  // 🔥 Listeners en tiempo real
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

  // 🍔 Subir producto
  const subirProducto = async (e) => {
    e.preventDefault();

    if (!imagen) {
      alert('Selecciona una imagen');
      return;
    }

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

      setNombre('');
      setPrecio('');
      setCategoria('Menu');
      setImagen(null);
    } catch (error) {
      console.error(error);
      alert('Error al subir el producto');
    } finally {
      setCargando(false);
    }
  };

  // 👤 Registrar admin
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

  // 🔁 Cambiar estado pedido
  const cambiarEstado = async (id, estado) => {
    await updateDoc(doc(db, 'pedidos', id), { estado });
  };

  // ================= RENDER =================
  return (
    <div className="admin-view">

      {/* ----------- GESTIÓN DE MENÚ ----------- */}
      {seccion === 'menu' && (
        <>
          <h2>Gestión de Menú</h2>

          <form onSubmit={subirProducto} className="admin-form">
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre"
              required
            />

            <input
              type="number"
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              placeholder="Precio"
              required
            />

            <select value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="Menu">Comidas</option>
              <option value="Cafeteria">Café</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Entradas">Entradas</option>
            </select>

            <label className="upload-label">
              <ImageIcon /> {imagen ? imagen.name : 'Subir Imagen'}
              <input type="file" accept="image/*" hidden onChange={e => setImagen(e.target.files[0])} />
            </label>

            <button disabled={cargando}>
              <Save /> {cargando ? 'Guardando...' : 'Guardar'}
            </button>
          </form>

          {productos.map(p => (
            <div key={p.id} className="admin-item">
              <span>{p.nombre}</span>

              <button onClick={() =>
                updateDoc(doc(db, 'productos', p.id), { disponible: !p.disponible })
              }>
                {p.disponible ? <Power /> : <PowerOff />}
              </button>

              <button onClick={() => deleteDoc(doc(db, 'productos', p.id))}>
                <Trash2 />
              </button>
            </div>
          ))}
        </>
      )}

      {/* ----------- ADMINISTRADORES ----------- */}
      {seccion === 'usuarios' && (
        <>
          <h2>Administradores</h2>

          <form onSubmit={registrarAdmin} className="admin-form">
            <Mail />
            <input
              type="email"
              placeholder="Correo admin"
              value={userEmail}
              onChange={e => setUserEmail(e.target.value)}
              required
            />
            <button>
              <UserPlus /> Agregar
            </button>
          </form>

          {usuarios.map(u => (
            <div key={u.id} className="admin-item">
              {u.email}
              <button onClick={() => deleteDoc(doc(db, 'usuarios_admin', u.id))}>
                <Trash2 />
              </button>
            </div>
          ))}
        </>
      )}

      {/* ----------- PEDIDOS ----------- */}
      {seccion === 'pedidos' && (
        <>
          <h2>Pedidos</h2>

          {pedidos.map(p => (
            <div key={p.id} className="pedido-card">
              <h3>{p.cliente.nombre}</h3>
              <p>📞 {p.cliente.telefono}</p>
              <p>📍 {p.cliente.direccion}</p>

              {p.productos.map((prod, i) => (
                <div key={i}>
                  {prod.nombre} - S/ {prod.precio.toFixed(2)}
                </div>
              ))}

              <h4>Total: S/ {p.total.toFixed(2)}</h4>
              <strong>Estado: {p.estado}</strong>

              <div className="pedido-actions">
                <button onClick={() => cambiarEstado(p.id, 'preparando')}>
                  <ChefHat size={18} /> Preparando
                </button>

                <button onClick={() => cambiarEstado(p.id, 'enviado')}>
                  <Truck size={18} /> Enviado
                </button>

                <button onClick={() => cambiarEstado(p.id, 'entregado')}>
                  <CheckCircle size={18} /> Entregado
                </button>
              </div>
            </div>
          ))}
        </>
      )}

    </div>
  );
};

export default Admin;
