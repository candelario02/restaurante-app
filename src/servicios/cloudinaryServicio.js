export const subirImagen = async (file, publicId = null) => {
  if (!file) return null;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "img_restaurantes");

  let urlFinal = `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`;
  let params = {};

  // Si estamos reemplazando una imagen existente, usamos subida firmada
  if (publicId) {
    const signatureResponse = await fetch("/api/cloudinary/firma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_id: publicId,
        folder: "img_restaurantes",
        overwrite: true,
        invalidate: true,
      }),
    });

    if (!signatureResponse.ok) {
      throw new Error("Error al obtener la firma de Cloudinary");
    }

    const { signature, timestamp, apiKey } = await signatureResponse.json();

    // Agregamos los parámetros necesarios para la subida firmada
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("public_id", publicId);
    formData.append("overwrite", "true");
    formData.append("invalidate", "true");
  } else {
    // Para productos nuevos, mantenemos subida sin firma (unsigned)
    formData.append(
      "upload_preset",
      import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
    );
  }

  try {
    const response = await fetch(urlFinal, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudinary error response:", errorText);
      throw new Error("Error al subir a Cloudinary");
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      public_id: data.public_id,
    };
  } catch (error) {
    console.error("Cloudinary Error:", error);
    return null;
  }
};
