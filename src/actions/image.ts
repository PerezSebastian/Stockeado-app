"use server";

import { auth } from "@/auth";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

/**
 * Server Action para subir una imagen en formato base64 a Cloudinary de manera segura.
 * Las credenciales secretas nunca se exponen al cliente.
 * @param base64Image Imagen en base64 (ej: data:image/jpeg;base64,...)
 * @param folder Carpeta de destino específica (opcional)
 * @returns Objeto con la url de la imagen subida o un mensaje de error controlado
 */
export async function uploadImageAction(base64Image: string, folder = "catalog") {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado. Debes iniciar sesión con un negocio vinculado para subir imágenes." };
    }

    try {
        const url = await uploadImageToCloudinary(base64Image, folder);
        return { url };
    } catch (error) {
        console.error("UPLOAD_IMAGE_ACTION_ERROR:", error);
        const errorMessage = error instanceof Error ? error.message : "Error de red o conexión al servidor de almacenamiento en la nube.";
        return { error: errorMessage };
    }
}
