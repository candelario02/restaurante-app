import React, { useState } from 'react';
import { db, storage } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, ArrowLeft, Utensils, Coffee, Pizza, Droplet, PlusSquare, LayoutGrid } from 'lucide-react';
import MenuCliente from './MenuCliente';

const Admin = () => {
  const [vista, setVista] = useState('menu'); // 'menu', 'subir'
  const [paso, setPaso] = useState(1); 
  const [categoria, setCategoria] = useState('');
  const [form, setForm] = useState({ nombre: '', precio: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const categorias = [
    { id: 'Entradas', icon: <Utensils />, label: 'Entradas' },
    { id: 'Menu', icon: <Pizza />, label: 'Menú / Fondo' },
    { id: 'Cafeteria', icon: <Coffee />, label: 'Cafetería' },
    { id: 'Bebidas', icon: <Droplet />, label: 'Bebidas' },
  ];

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!file) return alert("¡Toma una foto del producto!");
    setLoading(true);
    try {
      const storageRef = ref(storage, `productos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "productos"), {
        nombre: form.nombre,
        precio: Number(form.precio),
        categoria: categoria,
        img: url,
        disponible: true
      });

      alert("Producto subido correctamente");
      setPaso(1); setForm({ nombre: '', precio: '' }); setFile(null);
      setVista('menu'); // Regresa al menú para ver el producto nuevo
    } catch (e) { alert("Error al subir"); }
    setLoading(false);
  };

  return (
    <div className="admin-view">
      {/* Barra de Navegación Admin */}
      <nav className="admin-nav">
        <button onClick={() => setVista('menu')} className={vista === 'menu' ? 'active' : ''}>
          <LayoutGrid /> Caja/Ventas
        </button>
        <button onClick={() => setVista('subir')} className={vista === 'subir' ? 'active' : ''}>
          <PlusSquare /> Nuevo Producto
        </button>
      </nav>

      {vista === 'menu' ? (
        <MenuCliente esAdmin={true} />
      ) : (
        <div className="upload-section">
          {paso === 1 ? (
            <div className="cat-selector">
              <h2>¿Categoría del nuevo producto?</h2>
              <div className="grid-categorias">
                {categorias.map(cat => (
                  <button key={cat.id} onClick={() => {setCategoria(cat.id); setPaso(2)}} className="btn-cat">
                    {cat.icon} <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="form-subida">
              <button onClick={() => setPaso(1)} className="btn-volver"><ArrowLeft /> Volver</button>
              <form onSubmit={handleGuardar}>
                <h3>Subiendo a: {categoria}</h3>
                <input placeholder="Nombre del producto" required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
                <input type="number" placeholder="Precio S/" required value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} />
                <label className="foto-label">
                  <Camera /> {file ? "Foto Lista ✅" : "Tocar para Tomar Foto"}
                  <input type="file" accept="image/*" hidden onChange={e => setFile(e.target.files[0])} />
                </label>
                <button type="submit" disabled={loading} className="btn-publish">
                  {loading ? "Subiendo..." : "Publicar Ahora"}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin;