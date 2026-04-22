import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

// =============================
// 📦 CREAR PEDIDO (CLIENTE)
// =============================
export const crearProducto = async (datos, restauranteId) => {
  const docRef = await addDoc(collection(db, "productos"), {
    ...datos,
    restauranteId, // 🔥 Forzamos el vínculo con el local
    disponible: true,
    fechaCreacion: new Date()
  });
  return docRef.id;
};

// =============================
// 🔄 ACTUALIZAR ESTADO (ADMIN)
// =============================
export const actualizarEstadoPedido = async (id, estado) => {
  // Si la colección es plana, solo necesitas el ID del documento
  await updateDoc(
    doc(db, "pedidos", id),
    { estado }
  );
};