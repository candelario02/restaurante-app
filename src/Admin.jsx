import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, setDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { 
  Trash2, Power, PowerOff, ImageIcon, Save, 
  UserPlus, Mail, Truck, ChefHat, CheckCircle, Edit, Calendar, Eye, EyeOff, Phone, MessageCircle, FileText
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
      mostrarSms("No hay ventas para exportar en esta fecha", "error");
      return;
    }

    const doc = new jsPDF();
    const titulo = `Reporte de Ventas - ${fechaFiltro}`;
    
    doc.setFontSize(18);
    doc.text(restauranteId ? restauranteId.toUpperCase().replace('_', ' ') : 'REPORTE', 14, 20);
    doc.setFontSize(12);
    doc.text(titulo, 14, 30);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 38);

    const filasTabla = historialFiltrado.map(p => [
      p.fecha?.toDate().toLocaleTimeString() || '',
      p.cliente.nombre,
      p.cliente.tipo === 'delivery' ? 'Delivery' : 'Local',
      `S/ ${p.total.toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Hora', 'Cliente', 'Tipo', 'Total']],
      body: filasTabla,
      theme: 'grid',
      headStyles: { fillColor: [46, 204, 113] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text(`VENTA TOTAL DEL DÍA: S/ ${totalDia.toFixed(2)}`, 14, finalY);

    doc.save(`Reporte_${restauranteId}_${fechaFiltro}.pdf`);
  };

  // --- FUNCIÓN PARA WHATSAPP ---
  const abrirWhatsApp = (pedido) => {
    const numeroLimpio = pedido.cliente.telefono.replace(/\D/g, '');
    const listaProductos = pedido.productos.map(p => `- ${p.nombre}`).join('\n');
    const mensaje = `Hola ${pedido.cliente.nombre}, somos del restaurante. Tu pedido está en proceso.\n\n*Detalle:*\n${listaProductos}\n\n*Total:* S/ ${pedido.total.toFixed(2)}`;
    const url = `https://wa.me/51${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // --- SONIDO DE NUEVOS PEDIDOS ---
  useEffect(() => {
    if (!restauranteId) return;
    const q = query(
      collection(db, 'pedidos'), 
      where('restauranteId', '==', restauranteId),
      orderBy('fecha', 'desc'), 
      limit(1)
    );
    const unsubSonido = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const nuevoP = change.doc.data();
          const ahora = new Date().getTime();
          const fechaP = nuevoP.fecha?.seconds * 1000;
          if (ahora - fechaP < 10000) {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audio.play().catch(() => {});
          }
        }
      });
    });
    return () => unsubSonido();
  }, [restauranteId]);

  // --- CARGA DE DATOS ---
  useEffect(() => {
    if (!restauranteId) return;

    const qProd = query(collection(db, 'productos'), where('restauranteId', '==', restauranteId));
    const unsubProd = onSnapshot(qProd, (s) => 
      setProductos(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const qUser = query(collection(db, 'usuarios_admin'), where('restauranteId', '==', restauranteId));
    const unsubUser = onSnapshot(qUser, (s) => 
      setUsuarios(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const qPed = query(collection(db, 'pedidos'), where('restauranteId', '==', restauranteId));
    const unsubPed = onSnapshot(qPed, (s) => {
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
    const resp = await fetch('https://api.cloudinary.com/v1_1/drkrsfxlc/image/upload', {
      method: 'POST',
      body: formData
    });
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
        restauranteId // Usamos el restauranteId de las props
      };
      if (urlImagen) datos.img = urlImagen;

      if (editandoId) {
        await updateDoc(doc(db, 'productos', editandoId), datos);
        mostrarSms("Producto actualizado", "exito");
      } else {
        if (!urlImagen) throw new Error("Imagen requerida");
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
      // Forzamos que el nuevo admin pertenezca al mismo restaurante
      await setDoc(docRef, { email: userEmail.toLowerCase(), rol: 'admin', restauranteId });
      setUserEmail('');
      mostrarSms("Acceso concedido", "exito");
    } catch (e) { mostrarSms("Error de permisos", "error"); }
  };

  const cambiarEstado = async (id, nuevoEstado, estadoActual) => {
    if (estadoActual === 'entregado') return;
    if (nuevoEstado === 'entregado' && (estadoActual !== 'preparando' && estadoActual !== 'enviado')) {
      mostrarSms("Debe pasar por cocina o delivery", "error");
      return;
    }
    if (estadoActual === nuevoEstado) return;
    try {
      await updateDoc(doc(db, 'pedidos', id), { estado: nuevoEstado });
      mostrarSms(`Estado: ${nuevoEstado}`, "exito");
    } catch (error) {
      mostrarSms("Error al actualizar", "error");
    }
  };

  const pedidosActivos = pedidos.filter(p => (p.estado || 'pendiente') !== 'entregado');
  
  const historialFiltrado = pedidos.filter(p => {
    if (!p.fecha || p.estado !== 'entregado') return false;
    const fechaPedido = p.fecha.toDate().toISOString().split('T')[0];
    return fechaPedido === fechaFiltro;
  });

  const totalDia = historialFiltrado.reduce((acc, p) => acc + (p.total || 0), 0);
  
  // Total Mes filtrado por restauranteId ya garantizado por el useEffect
  const totalMes = pedidos.filter(p => {
    if (!p.fecha || p.estado !== 'entregado') return false;
    const date = p.fecha.toDate();
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
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
            <label className="btn-top-login">
              <ImageIcon size={18} /> 
              <span>{imagen ? imagen.name : (editandoId ? 'Cambiar Imagen' : 'Subir Imagen')}</span>
              <input type="file" hidden accept="image/*" onChange={e => setImagen(e.target.files[0])}/>
            </label>
            <div className="modal-buttons">
              {editandoId && <button type="button" className="btn-no" onClick={cancelarEdicion}>Cancelar</button>}
              <button className={`btn-login-submit ${cargando ? 'btn-loading' : ''}`} disabled={cargando}>
                {cargando ? <div className="spinner-loader"></div> : <><Save size={18}/> {editandoId ? 'Actualizar' : 'Guardar'}</>}
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
                    <td>S/ {p.precio.toFixed(2)}</td>
                    <td><button className="btn-back-inline" onClick={() => updateDoc(doc(db, 'productos', p.id), { disponible: !p.disponible })}>{p.disponible ? <Power color="var(--success)" size={18}/> : <PowerOff color="var(--danger)" size={18}/>}</button></td>
                    <td><div className="admin-buttons-acciones"><button className="btn-back-inline" onClick={() => prepararEdicion(p)}><Edit size={16}/></button><button className="btn-back-inline" onClick={() => window.confirm('¿Eliminar?') && deleteDoc(doc(db, 'productos', p.id))}><Trash2 color="var(--danger)" size={16}/></button></div></td>
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
            <div className="input-group">
              <Mail className="input-icon"/><input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="Correo electrónico" required />
            </div>
            <button className="btn-login-submit"><UserPlus size={18}/> Dar Acceso</button>
          </form>
          <div className="tabla-admin-container">
            <table className="tabla-admin">
              <thead><tr><th>Email</th><th>Quitar</th></tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}><td>{u.email}</td><td><button className="btn-back-inline" onClick={() => deleteDoc(doc(db, 'usuarios_admin', u.id))}><Trash2 color="var(--danger)" size={18}/></button></td></tr>
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
                  {p.cliente.tipo === 'delivery' && (
                    <button className="btn-back-inline" onClick={() => abrirWhatsApp(p)} style={{color: '#25D366'}}>
                      <Phone size={20} />
                    </button>
                  )}
                  <span className="text-muted">{p.fecha?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-muted" style={{fontSize: '0.85rem', marginBottom: '10px'}}>
                  <Truck size={14}/> {p.cliente.direccion || 'Local'}
                </p>
                
                <div className="pedido-lista-productos">
                  {p.productos.map((prod, idx) => (
                    <div key={idx} className="pedido-item-row">
                      <span>{prod.nombre}</span>
                      <span className="bold">S/ {prod.precio.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pedido-total-row">Total: S/ {p.total.toFixed(2)}</div>
                </div>

                <div className="pedido-status-container">
                  <span className={`status-badge ${p.estado || 'pendiente'}`}>
                    {p.estado ? p.estado.toUpperCase() : 'PENDIENTE'}
                  </span>
                </div>

                <div className="modal-buttons" style={{marginTop: '15px'}}>
                  <button className={`btn-no ${p.estado === 'preparando' ? 'btn-active' : ''}`} onClick={() => cambiarEstado(p.id, 'preparando', p.estado)}>
                    <ChefHat size={18}/>
                  </button>
                  <button className={`btn-no ${p.estado === 'enviado' ? 'btn-active' : ''}`} onClick={() => cambiarEstado(p.id, 'enviado', p.estado)}>
                    <Truck size={18}/>
                  </button>
                  <button className="btn-yes-success" onClick={() => cambiarEstado(p.id, 'entregado', p.estado)}>
                    <CheckCircle size={18}/>
                  </button>
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

          <div className="historial-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', gap: '10px'}}>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <h2 className="titulo-principal" style={{fontSize: '1rem', margin: 0}}>Historial</h2>
                <button onClick={generarReportePDF} className="btn-top-gestion" style={{width: 'auto', padding: '5px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none'}}>
                  <FileText size={16} /> PDF
                </button>
            </div>
            <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="btn-top-gestion" style={{width: 'auto'}}/>
          </div>

          <div className="productos-grid">
            {historialFiltrado.map(p => (
              <div key={p.id} className="producto-card-pedido status-entregado-card">
                <div className="pedido-header">
                  <h3>{p.cliente.nombre}</h3>
                  <div style={{display: 'flex', gap: '10px'}}>
                    {p.cliente.tipo === 'delivery' && (
                      <button className="btn-back-inline" onClick={() => abrirWhatsApp(p)} style={{color: '#25D366'}}>
                        <MessageCircle size={18} />
                      </button>
                    )}
                    <button className="btn-back-inline" onClick={() => setPedidoExpandido(pedidoExpandido === p.id ? null : p.id)}>
                      {pedidoExpandido === p.id ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>
                {pedidoExpandido === p.id && (
                  <div className="pedido-lista-productos">
                    {p.productos.map((prod, idx) => (
                      <div key={idx} className="pedido-item-row"><span>{prod.nombre}</span><span>S/ {prod.precio.toFixed(2)}</span></div>
                    ))}
                  </div>
                )}
                <div className="pedido-total-row">Cobrado: S/ {p.total.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;