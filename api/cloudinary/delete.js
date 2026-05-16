//servicio para elimanacion de iamgen en cloudinary
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { public_id, folder, overwrite, invalidate } = req.body;

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    return res.status(500).json({ error: "Faltan credenciales de Cloudinary" });
  }

  const timestamp = Math.floor(Date.now() / 1000);

  const params = {
    folder: folder || "img_restaurantes",
    invalidate: invalidate === undefined ? true : invalidate,
    overwrite: overwrite === undefined ? true : overwrite,
    public_id: public_id,
    timestamp: timestamp,
  };

  const sortedKeys = Object.keys(params).sort();
  let signatureString = "";
  for (const key of sortedKeys) {
    signatureString += `${key}=${params[key]}&`;
  }
  signatureString = signatureString.slice(0, -1) + apiSecret;

  const signature = crypto
    .createHash("sha1")
    .update(signatureString)
    .digest("hex");

  res.status(200).json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
  });
}
