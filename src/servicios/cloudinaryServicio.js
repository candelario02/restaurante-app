export const subirImagen = async (file) => {
  if (!file) return null;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "img_restaurantes"); // ✅ Se guardará en tu carpeta específica

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) throw new Error("Error al subir a Cloudinary");

    const data = await response.json();
    return data.secure_url; 
  } catch (error) {
    console.error("Cloudinary Error:", error);
    return null;
  }
};