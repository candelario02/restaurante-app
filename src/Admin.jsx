import React, { useState, useEffect } from 'react';
import { db, storage } from './firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PlusCircle, Trash2, Power, PowerOff, Image as ImageIcon, Save } from 'lucide-react';

const Admin = () => {
  const [productos, setProductos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('Menu');
  const [imagen, setImagen] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Leer productos en tiempo real
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "productos"), (snapshot) => {
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
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
        nombre,
        precio: parseFloat(precio),
        categoria,
        img: url,
        disponible: true // Se crea activo por defecto
      });

      setNombre(''); setPrecio(''); setImagen(null);
      alert("Producto guardado con éxito");
    } catch (error) {
      console.error(error);
      alert("Error al subir");
    }
    setCargando(false);
  };

  // FUNCIÓN CLAVE: Activar o Desactivar producto
  const alternarDisponibilidad = async (id, estadoActual) => {
    const productoRef = doc(db, "productos", id);
    await updateDoc(productoRef, {
      disponible: !estadoActual
    });
  };

  const eliminarProducto = async (id) => {
    if (window.confirm("¿Eliminar este producto permanentemente?")) {
      await deleteDoc(doc(db, "productos", id));
    }
  };

  return (
    <div className="admin-view">
      <div className="admin-header">
        <h2>Panel de Control</h2>
        <p>Gestiona tus platos y disponibilidad</p>
      </div>

      {/* Formulario para subir nuevo plato */}
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

      {/* Lista de gestión para el Admin */}
      <div className="admin-products-list">
        <h3>Tus Productos</h3>
        {productos.map(p => (
          <div key={p.id} className={`admin-product-item ${!p.disponible ? 'product-off' : ''}`}>
            <img src={p.img} alt="" />
            <div className="admin-info">
              <h4>{p.nombre}</h4>
              <span>S/ {p.precio.toFixed(2)}</span>
            </div>
            <div className="admin-actions">
              {/* Botón de ACTIVAR / DESACTIVAR */}
              <button 
                className={`btn-toggle ${p.disponible ? 'is-on' : 'is-off'}`}
                onClick={() => alternarDisponibilidad(p.id, p.disponible)}
                title={p.disponible ? "Desactivar plato" : "Activar plato"}
              >
                {p.disponible ? <Power size={20} /> : <PowerOff size={20} />}
              </button>
              
              <button className="btn-delete" onClick={() => eliminarProducto(p.id)}>
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;