import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

// =============================
// 📦 CREAR PEDIDO (CLIENTE)
// =============================

export const crearPedido = async (restauranteId, pedido) => {
  const docRef = await addDoc(
    collection(db, "restaurantes", restauranteId, "pedidos"),
    {
      ...pedido,
      estado: "pendiente",
      fecha: new Date()
    }
  );

  return docRef.id;
};

// =============================
// 🔄 ACTUALIZAR ESTADO (ADMIN)
// =============================

export const actualizarEstadoPedido = async (restauranteId, id, estado) => {
  await updateDoc(
    doc(db, "restaurantes", restauranteId, "pedidos", id),
    { estado }
  );
};