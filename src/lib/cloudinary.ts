import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

/**
 * Sube una imagen en formato base64 a Cloudinary de manera optimizada.
 * @param base64Image Imagen en base64 (ej: data:image/jpeg;base64,...)
 * @param folder Carpeta de destino en Cloudinary
 * @returns URL pública y segura de la imagen en HTTPS
 */
export async function uploadImageToCloudinary(base64Image: string, folder = "catalog"): Promise<string> {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error("Las variables de entorno de Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) no están configuradas.");
    }

    try {
        const result = await cloudinary.uploader.upload(base64Image, {
            folder: `stockeado_app/${folder}`,
            resource_type: "image",
            fetch_format: "auto",
            quality: "auto",
        });

        const secureUrl = result.secure_url;

        // Guardarraíl por defecto en DB: limitar a 1000px y aplicar compresión automática
        if (secureUrl.includes("/upload/")) {
            return secureUrl.replace("/upload/", "/upload/c_limit,w_1000,h_1000,f_auto,q_auto/");
        }

        return secureUrl;
    } catch (error) {
        console.error("CLOUDINARY_UPLOAD_ERROR:", error);
        const errorMessage = error instanceof Error ? error.message : "Error al subir el archivo al almacenamiento en la nube.";
        throw new Error(errorMessage);
    }
}

/**
 * Genera una URL de Cloudinary con transformaciones dinámicas.
 */

/**
 * Extrae el public ID de una URL de Cloudinary para poder operarlo.
 */
export function extractPublicIdFromUrl(url: string): string | null {
    if (!url.includes("res.cloudinary.com")) return null;
    
    try {
        const parts = url.split("/upload/");
        if (parts.length < 2) return null;
        
        // Quitar transformaciones o versión (ej: f_auto,q_auto/v123456/folder/id.jpg)
        const pathParts = parts[1].split("/");
        const startIndex = pathParts.findIndex(p => p === "stockeado_app");
        if (startIndex === -1) return null;
        
        const publicIdWithExtension = pathParts.slice(startIndex).join("/");
        const lastDotIndex = publicIdWithExtension.lastIndexOf(".");
        if (lastDotIndex === -1) return publicIdWithExtension;
        
        return publicIdWithExtension.substring(0, lastDotIndex);
    } catch (error) {
        console.error("EXTRACT_PUBLIC_ID_ERROR:", error);
        return null;
    }
}

/**
 * Elimina un archivo de Cloudinary usando su URL pública.
 */
export async function deleteImageFromCloudinary(url: string): Promise<boolean> {
    const publicId = extractPublicIdFromUrl(url);
    if (!publicId) return false;
    
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === "ok";
    } catch (error) {
        console.error("CLOUDINARY_DELETE_ERROR:", error);
        return false;
    }
}
