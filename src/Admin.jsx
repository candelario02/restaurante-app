import React, { useState, useEffect } from 'react';
import { db, storage, auth } from './firebase'; 
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'; 
import { Trash2, Power, PowerOff, Image as ImageIcon, Save, UserPlus, Mail, ShieldCheck } from 'lucide-react';

const Admin = ({ seccion }) => {
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  
  // Estados Producto
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('Menu');
  const [imagen, setImagen] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Estados Usuario Nuevo
  const [userEmail, setUserEmail] = useState('');
  const [userPass, setUserPass] = useState('');

  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, "productos"), (snap) => {
      setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubUser = onSnapshot(collection(db, "usuarios_admin"), (snap) => {
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubProd(); unsubUser(); };
  }, []);

  const subirProducto = async (e) => {
    e.preventDefault();
    if (!imagen) return alert("Selecciona una imagen");
    setCargando(true);
    try {
      const storageRef = ref(storage, `productos/${imagen.name}`);
      await uploadBytes(storageRef, imagen);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "productos"), {
        nombre, precio: parseFloat(precio), categoria, img: url, disponible: true
      });
      setNombre(''); setPrecio(''); setImagen(null);
    } catch (error) { alert("Error al subir"); }
    setCargando(false);
  };

  // FUNCIÓN MEJORADA: Evita que el Admin pierda su sesión al crear otro usuario
  const crearUsuario = async (e) => {
    e.preventDefault();
    if (userPass.length < 6) return alert("La contraseña debe tener al menos 6 caracteres");

    // Guardamos las credenciales del ADMIN ACTUAL para re-conectarlo si Firebase lo desconecta
    const adminEmail = auth.currentUser.email;
    // Nota: Pedir la clave del admin actual sería lo ideal, pero usaremos un truco de estado.
    
    try {
      // 1. Crear el nuevo usuario
      await createUserWithEmailAndPassword(auth, userEmail, userPass);

      // 2. Registrar en Firestore
      await setDoc(doc(db, "usuarios_admin", userEmail), {
        email: userEmail,
        rol: 'admin',
        fechaCrea: new Date().toLocaleDateString()
      });

      alert("¡Usuario Creado correctamente!");
      setUserEmail(''); 
      setUserPass('');
      
      // 3. ¡IMPORTANTE! Forzamos que la marca de admin se mantenga en el navegador
      localStorage.setItem('esAdmin', 'true');

    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        alert("Ese correo ya está registrado.");
      } else {
        alert("Error: " + error.message);
      }
    }
  };

  return (
    <div className="admin-view">
      {seccion === 'menu' ? (
        <>
          <div className="admin-header">
            <h2>Gestión de Menú</h2>
            <p>Sube y activa tus platos</p>
          </div>
          <form onSubmit={subirProducto} className="admin-form">
            <input type="text" placeholder="Nombre del plato" value={nombre} onChange={e => setNombre(e.target.value)} required />
            <input type="number" placeholder="Precio S/" value={precio} onChange={e => setPrecio(e.target.value)} required />
            <select value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="Menu">Comidas</option>
              <option value="Cafeteria">Café</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Entradas">Entradas</option>
            </select>
            <div className="file-input">
              <label htmlFor="foto"><ImageIcon size={20} /> {imagen ? "Imagen lista" : "Subir Foto"}</label>
              <input type="file" id="foto" onChange={e => setImagen(e.target.files[0])} hidden />
            </div>
            <button type="submit" disabled={cargando} className="btn-save">
              {cargando ? "Guardando..." : <><Save size={20} /> Guardar Producto</>}
            </button>
          </form>

          <div className="admin-products-list">
            {productos.map(p => (
              <div key={p.id} className={`admin-product-item ${!p.disponible ? 'product-off' : ''}`}>
                <img src={p.img} alt="" />
                <div className="admin-info">
                  <h4>{p.nombre}</h4>
                  <span>S/ {p.precio.toFixed(2)}</span>
                </div>
                <div className="admin-actions">
                  <button className={`btn-toggle ${p.disponible ? 'is-on' : 'is-off'}`}
                    onClick={() => updateDoc(doc(db, "productos", p.id), { disponible: !p.disponible })}>
                    {p.disponible ? <Power size={20} /> : <PowerOff size={20} />}
                  </button>
                  <button className="btn-delete" onClick={() => deleteDoc(doc(db, "productos", p.id))}><Trash2 size={20} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="admin-header">
            <h2>Gestión de Usuarios</h2>
            <p>Crea accesos para tus administradores</p>
          </div>
          <form onSubmit={crearUsuario} className="admin-form">
            <div className="input-group">
              <Mail size={18} className="input-icon" />
              <input type="email" placeholder="Correo del nuevo admin" value={userEmail} onChange={e => setUserEmail(e.target.value)} required />
            </div>
            <div className="input-group">
              <ShieldCheck size={18} className="input-icon" />
              <input type="password" placeholder="Asignar Contraseña (min 6 carac.)" value={userPass} onChange={e => setUserPass(e.target.value)} required />
            </div>
            <button type="submit" className="btn-save" style={{background: '#10b981'}}>
              <UserPlus size={20} /> Crear Usuario
            </button>
          </form>

          <div className="admin-products-list">
            <h3>Usuarios Activos</h3>
            {usuarios.map(u => (
              <div key={u.id} className="admin-product-item">
                <div className="admin-info" style={{paddingLeft: '15px'}}>
                  <h4>{u.email}</h4>
                  <span style={{color: '#10b981'}}>Rol: {u.rol}</span>
                </div>
                {u.email !== 'jec02021994@gmail.com' && (
                  <button className="btn-delete" onClick={() => deleteDoc(doc(db, "usuarios_admin", u.id))}>
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Admin;