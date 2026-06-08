/**
 * Genera una URL de Cloudinary con transformaciones dinámicas.
 * Este archivo es seguro para ser usado tanto en Client Components como en Server Components.
 */
export function getCloudinaryUrl(
    url: string | null | undefined,
    options: {
        width?: number;
        height?: number;
        crop?: "fill" | "limit" | "fit" | "thumb" | "pad";
        quality?: "auto" | "auto:eco" | "auto:low" | "auto:good";
    } = {}
): string {
    if (!url) return "";
    if (!url.includes("res.cloudinary.com")) return url;

    const { width, height, crop = "limit", quality = "auto" } = options;
    const transforms: string[] = [];

    if (crop) transforms.push(`c_${crop}`);
    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);
    
    transforms.push("f_auto");
    transforms.push(`q_${quality}`);

    const transformStr = transforms.join(",");
    
    const parts = url.split("/upload/");
    if (parts.length < 2) return url;

    const prefix = parts[0];
    const rest = parts[1];

    const restParts = rest.split("/");
    const firstSegment = restParts[0];
    const isVersion = /^v\d+$/.test(firstSegment);
    const isFolder = firstSegment === "stockeado_app";

    if (!isVersion && !isFolder) {
        restParts[0] = transformStr;
    } else {
        restParts.unshift(transformStr);
    }

    return `${prefix}/upload/${restParts.join("/")}`;
}
