import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { public_id } = req.body;
  if (!public_id) {
    return res.status(400).json({ error: "Falta public_id" });
  }

  const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: "Faltan credenciales de Cloudinary" });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`public_id=${public_id}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const formData = new URLSearchParams();
  formData.append("public_id", public_id);
  formData.append("timestamp", timestamp);
  formData.append("api_key", apiKey);
  formData.append("signature", signature);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: "POST",
        body: formData,
      },
    );
    const data = await response.json();

    if (data.result === "ok") {
      res.status(200).json({ success: true });
    } else {
      res
        .status(500)
        .json({ error: "No se pudo eliminar la imagen", details: data });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
