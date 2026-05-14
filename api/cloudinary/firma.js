import crypto from "crypto";

export default async function handler(req, res) {
  // Solo aceptamos POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // Obtenemos los parámetros necesarios para la firma
  const { public_id, folder, timestamp: clientTimestamp } = req.body;

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    return res.status(500).json({ error: "Faltan credenciales de Cloudinary" });
  }

  // Generamos el timestamp actual
  const timestamp = Math.floor(Date.now() / 1000);

  // Construimos la cadena a firmar (similar a como lo haces en delete.js)
  let signatureString = `timestamp=${timestamp}`;
  if (public_id) signatureString += `&public_id=${public_id}`;
  if (folder) signatureString += `&folder=${folder}`;
  signatureString += apiSecret;

  // Generamos la firma SHA-1
  const signature = crypto
    .createHash("sha1")
    .update(signatureString)
    .digest("hex");

  // Devolvemos la firma y el timestamp al frontend
  res.status(200).json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
  });
}
