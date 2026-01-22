import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, 
  updateDoc, setDoc, query, orderBy, limit, where 
} from 'firebase/firestore';
import { 
  Trash2, Power, PowerOff, ImageIcon, Save, 
  UserPlus, Mail, Truck, ChefHat, CheckCircle, Edit, 
  Eye, EyeOff, Phone, MessageCircle, FileText
} from 'lucide-react';
// Librerías para el PDF
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Admin = ({ seccion, restauranteId }) => { 
  const [productos, setProductos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('Menu');
  const [imagen, setImagen] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  
  const [cargando, setCargando] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [notificacion, setNotificacion] = useState({ texto: '', tipo: '' });

  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [pedidoExpandido, setPedidoExpandido] = useState(null);

  // --- FUNCIÓN PARA GENERAR PDF ---
  const generarReportePDF = () => {
    if (historialFiltrado.length === 0) {
      mostrarSms("No hay ventas para exportar", "error");
      return;
    }
    const docPdf = new jsPDF();
    docPdf.setFontSize(18);
    docPdf.text(restauranteId ? restauranteId.toUpperCase().replace('_', ' ') : 'REPORTE', 14, 20);
    docPdf.setFontSize(12);
    docPdf.text(`Reporte de Ventas - ${fechaFiltro}`, 14, 30);

    const filasTabla = historialFiltrado.map(p => [
      p.fecha?.toDate().toLocaleTimeString() || '',
      p.cliente.nombre,
      p.cliente.tipo === 'delivery' ? 'Delivery' : 'Local',
      `S/ ${p.total.toFixed(2)}`
    ]);

    docPdf.autoTable({
      startY: 45,
      head: [['Hora', 'Cliente', 'Tipo', 'Total']],
      body: filasTabla,
      theme: 'grid',
      headStyles: { fillColor: [46, 204, 113] }
    });

    const finalY = docPdf.lastAutoTable.finalY + 10;
    docPdf.text(`VENTA TOTAL DEL DÍA: S/ ${totalDia.toFixed(2)}`, 14, finalY);
    docPdf.save(`Reporte_${restauranteId}_${fechaFiltro}.pdf`);
  };

  // --- WHATSAPP ---
  const abrirWhatsApp = (pedido) => {
    const numeroLimpio = pedido.cliente.telefono.replace(/\D/g, '');
    const listaProductos = pedido.productos.map(p => `- ${p.nombre}`).join('\n');
    const mensaje = `Hola ${pedido.cliente.nombre}, somos del restaurante. Tu pedido está en proceso.\n\n*Detalle:*\n${listaProductos}\n\n*Total:* S/ ${pedido.total.toFixed(2)}`;
    window.open(`https://wa.me/51${numeroLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // --- SONIDO Y CARGA DE DATOS ---
  useEffect(() => {
    if (!restauranteId) return;

    // Productos
    const qProd = query(collection(db, 'productos'), where('restauranteId', '==', restauranteId));
    const unsubProd = onSnapshot(qProd, (s) => setProductos(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    // Usuarios
    const qUser = query(collection(db, 'usuarios_admin'), where('restauranteId', '==', restauranteId));
    const unsubUser = onSnapshot(qUser, (s) => setUsuarios(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    // Pedidos (con sonido para nuevos)
    const qPed = query(collection(db, 'pedidos'), where('restauranteId', '==', restauranteId));
    const unsubPed = onSnapshot(qPed, (s) => {
      s.docChanges().forEach(change => {
        if (change.type === "added") {
          const pData = change.doc.data();
          if ((new Date().getTime() - (pData.fecha?.seconds * 1000)) < 10000) {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(()=>{});
          }
        }
      });
      const docs = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setPedidos(docs.sort((a,b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0)));
    });

    return () => { unsubProd(); unsubUser(); unsubPed(); };
  }, [restauranteId]);

  const mostrarSms = (texto, tipo) => {
    setNotificacion({ texto, tipo });
    setTimeout(() => setNotificacion({ texto: '', tipo: '' }), 3000);
  };

  const subirACloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'restaurante_preset');
    const resp = await fetch('https://api.cloudinary.com/v1_1/drkrsfxlc/image/upload', { method: 'POST', body: formData });
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
        disponible: true, 
        restauranteId: restauranteId // <--- FORZAMOS TU ID DINÁMICO
      };

      if (editandoId) {
        // Al editar, si no hay imagen nueva, no sobreescribimos la anterior
        if (urlImagen) datos.img = urlImagen;
        await updateDoc(doc(db, 'productos', editandoId), datos);
        mostrarSms("Producto actualizado", "exito");
      } else {
        if (!urlImagen) throw new Error("Imagen requerida");
        datos.img = urlImagen;
        await addDoc(collection(db, 'productos'), datos);
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
      const docRef = doc(db, 'usuarios_admin', userEmail.toLowerCase());
      await setDoc(docRef, { email: userEmail.toLowerCase(), rol: 'admin', restauranteId });
      setUserEmail('');
      mostrarSms("Acceso concedido", "exito");
    } catch (e) { mostrarSms("Error de permisos", "error"); }
  };

  const cambiarEstado = async (id, nuevoEstado, estadoActual) => {
    if (estadoActual === 'entregado') return;
    try {
      await updateDoc(doc(db, 'pedidos', id), { estado: nuevoEstado });
      mostrarSms(`Estado: ${nuevoEstado}`, "exito");
    } catch (error) { mostrarSms("Error al actualizar", "error"); }
  };

  // Cálculos de Ventas
  const pedidosActivos = pedidos.filter(p => (p.estado || 'pendiente') !== 'entregado');
  const historialFiltrado = pedidos.filter(p => {
    if (!p.fecha || p.estado !== 'entregado') return false;
    return p.fecha.toDate().toISOString().split('T')[0] === fechaFiltro;
  });

  const totalDia = historialFiltrado.reduce((acc, p) => acc + (p.total || 0), 0);
  const totalMes = pedidos.filter(p => {
    if (!p.fecha || p.estado !== 'entregado') return false;
    const d = p.fecha.toDate();
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((acc, p) => acc + (p.total || 0), 0);

  return (
    <div className="admin-container">
      {notificacion.texto && (
        <div className="overlay-msg">
          <div className={`mensaje-alerta ${notificacion.tipo}`}>{notificacion.texto}</div>
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
            <label className="btn-top-login" style={{cursor: 'pointer'}}>
              <ImageIcon size={18} /> 
              <span>{imagen ? imagen.name : (editandoId ? 'Cambiar Imagen' : 'Subir Imagen')}</span>
              <input type="file" hidden accept="image/*" onChange={e => setImagen(e.target.files[0])}/>
            </label>
            <div className="modal-buttons" style={{marginTop:'15px'}}>
              {editandoId && <button type="button" className="btn-no" onClick={cancelarEdicion}>Cancelar</button>}
              <button className={`btn-login-submit ${cargando ? 'btn-loading' : ''}`} disabled={cargando}>
                {cargando ? "Cargando..." : <><Save size={18}/> {editandoId ? 'Actualizar' : 'Guardar'}</>}
              </button>
            </div>
          </form>

          <div className="tabla-admin-container">
            <table className="tabla-admin">
              <thead><tr><th>Plato</th><th>Precio</th><th>Disp.</th><th>Acciones</th></tr></thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id}>
                    <td><div className="categoria-item-mini"><img src={p.img} alt="" className="img-tabla" /><span>{p.nombre}</span></div></td>
                    <td>S/ {Number(p.precio).toFixed(2)}</td>
                    <td><button className="btn-back-inline" onClick={() => updateDoc(doc(db, 'productos', p.id), { disponible: !p.disponible })}>{p.disponible ? <Power color="#2ecc71" size={18}/> : <PowerOff color="#e74c3c" size={18}/>}</button></td>
                    <td><div className="admin-buttons-acciones"><button className="btn-back-inline" onClick={() => prepararEdicion(p)}><Edit size={16}/></button><button className="btn-back-inline" onClick={() => window.confirm('¿Eliminar?') && deleteDoc(doc(db, 'productos', p.id))}><Trash2 color="#e74c3c" size={16}/></button></div></td>
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
            <div className="input-group"><Mail className="input-icon"/><input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="Correo electrónico" required /></div>
            <button className="btn-login-submit"><UserPlus size={18}/> Dar Acceso</button>
          </form>
          <div className="tabla-admin-container">
            <table className="tabla-admin">
              <thead><tr><th>Email</th><th>Quitar</th></tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}><td>{u.email}</td><td><button className="btn-back-inline" onClick={() => deleteDoc(doc(db, 'usuarios_admin', u.id))}><Trash2 color="#e74c3c" size={18}/></button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {seccion === 'pedidos' && (
        <div className="pedidos-seccion-wrapper">
          <h2 className="titulo-principal">En Cocina ({pedidosActivos.length})</h2>
          <div className="productos-grid">
            {pedidosActivos.map(p => (
              <div key={p.id} className="producto-card-pedido">
                <div className="pedido-header">
                  <h3>{p.cliente.nombre}</h3>
                  {p.cliente.tipo === 'delivery' && <button className="btn-back-inline" onClick={() => abrirWhatsApp(p)} style={{color: '#25D366'}}><Phone size={20} /></button>}
                  <span className="text-muted">{p.fecha?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-muted" style={{fontSize: '0.85rem', marginBottom: '10px'}}><Truck size={14}/> {p.cliente.direccion || 'Local'}</p>
                <div className="pedido-lista-productos">
                  {p.productos.map((prod, idx) => (
                    <div key={idx} className="pedido-item-row"><span>{prod.nombre}</span><span className="bold">S/ {Number(prod.precio).toFixed(2)}</span></div>
                  ))}
                  <div className="pedido-total-row">Total: S/ {Number(p.total).toFixed(2)}</div>
                </div>
                <div className={`status-badge ${p.estado || 'pendiente'}`} style={{marginTop:'10px'}}>{(p.estado || 'pendiente').toUpperCase()}</div>
                <div className="modal-buttons" style={{marginTop: '15px'}}>
                  <button className="btn-no" onClick={() => cambiarEstado(p.id, 'preparando', p.estado)}><ChefHat size={18}/></button>
                  <button className="btn-no" onClick={() => cambiarEstado(p.id, 'enviado', p.estado)}><Truck size={18}/></button>
                  <button className="btn-yes" style={{background:'#2ecc71'}} onClick={() => cambiarEstado(p.id, 'entregado', p.estado)}><CheckCircle size={18}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {seccion === 'ventas' && (
        <div className="pedidos-seccion-wrapper">
          <div className="contabilidad-resumen">
            <div className="card-stat"><p>Vendido Hoy</p><h2>S/ {totalDia.toFixed(2)}</h2></div>
            <div className="card-stat"><p>Total Mes</p><h2>S/ {totalMes.toFixed(2)}</h2></div>
          </div>
          <div className="historial-header" style={{display: 'flex', justifyContent: 'space-between', marginTop: '20px'}}>
             <div style={{display:'flex', gap:'10px'}}>
                <button onClick={generarReportePDF} className="btn-yes" style={{background:'#e74c3c', padding:'5px 15px'}}><FileText size={16}/> PDF</button>
             </div>
             <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="btn-top-gestion" style={{width:'auto'}}/>
          </div>
          <div className="productos-grid" style={{marginTop:'20px'}}>
            {historialFiltrado.map(p => (
              <div key={p.id} className="producto-card-pedido status-entregado-card">
                <div className="pedido-header">
                  <h3>{p.cliente.nombre}</h3>
                  <button className="btn-back-inline" onClick={() => setPedidoExpandido(pedidoExpandido === p.id ? null : p.id)}>
                    {pedidoExpandido === p.id ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
                {pedidoExpandido === p.id && (
                  <div className="pedido-lista-productos">
                    {p.productos.map((prod, idx) => (
                      <div key={idx} className="pedido-item-row"><span>{prod.nombre}</span><span>S/ {Number(prod.precio).toFixed(2)}</span></div>
                    ))}
                  </div>
                )}
                <div className="pedido-total-row">Cobrado: S/ {Number(p.total).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;