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
  ShieldCheck
} from 'lucide-react';

const Admin = ({ seccion }) => {
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('Menu');
  const [imagen, setImagen] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, "productos"), snap => {
      setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubUser = onSnapshot(collection(db, "usuarios_admin"), snap => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubProd();
      unsubUser();
    };
  }, []);

  const subirProducto = async (e) => {
    e.preventDefault();
    if (!imagen) return alert("Selecciona una imagen");

    setCargando(true);
    try {
      const storageRef = ref(storage, `productos/${Date.now()}_${imagen.name}`);
      await uploadBytes(storageRef, imagen);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "productos"), {
        nombre,
        precio: Number(precio),
        categoria,
        img: url,
        disponible: true
      });

      setNombre('');
      setPrecio('');
      setImagen(null);
    } catch (e) {
      alert("Error al subir producto");
    }
    setCargando(false);
  };

  const registrarAdmin = async (e) => {
    e.preventDefault();
    if (!userEmail) return;

    await setDoc(doc(db, "usuarios_admin", userEmail), {
      email: userEmail,
      rol: "admin",
      creado: new Date().toISOString()
    });

    setUserEmail('');
    alert("Correo autorizado como Admin");
  };

  return (
    <div className="admin-view">
      {seccion === 'menu' ? (
        <>
          <h2>Gestión de Menú</h2>

          <form onSubmit={subirProducto} className="admin-form">
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre" required />
            <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Precio" required />
            <select value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="Menu">Comidas</option>
              <option value="Cafeteria">Café</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Entradas">Entradas</option>
            </select>

            <label>
              <ImageIcon /> {imagen ? imagen.name : "Subir Imagen"}
              <input type="file" hidden onChange={e => setImagen(e.target.files[0])} />
            </label>

            <button disabled={cargando}>
              <Save /> Guardar
            </button>
          </form>

          {productos.map(p => (
            <div key={p.id}>
              <span>{p.nombre}</span>
              <button onClick={() => updateDoc(doc(db, "productos", p.id), { disponible: !p.disponible })}>
                {p.disponible ? <Power /> : <PowerOff />}
              </button>
              <button onClick={() => deleteDoc(doc(db, "productos", p.id))}>
                <Trash2 />
              </button>
            </div>
          ))}
        </>
      ) : (
        <>
          <h2>Admins</h2>

          <form onSubmit={registrarAdmin}>
            <Mail />
            <input
              type="email"
              placeholder="Correo admin"
              value={userEmail}
              onChange={e => setUserEmail(e.target.value)}
              required
            />
            <button>
              <UserPlus /> Autorizar
            </button>
          </form>

          {usuarios.map(u => (
            <div key={u.id}>
              {u.email}
              <button onClick={() => deleteDoc(doc(db, "usuarios_admin", u.id))}>
                <Trash2 />
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default Admin;
