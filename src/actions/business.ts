"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

export async function updateBusinessInfo(formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user) {
            return { error: "No autorizado" };
        }

        const role = session.user.role;
        if (role !== UserRole.ADMIN && role !== UserRole.OWNER) {
            return { error: "No tienes permisos para editar el negocio" };
        }

        const businessId = session.user.businessId;
        const name = formData.get("name") as string;
        const domain = formData.get("domain") as string | null;

        if (!name || name.trim().length === 0) {
            return { error: "El nombre es requerido" };
        }

        // Validate domain format if provided
        let cleanDomain = null;
        if (domain && domain.trim().length > 0) {
            cleanDomain = domain.trim().toLowerCase().replace(/https?:\/\//, "").replace(/\/$/, "");
            // Basic domain check
            if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanDomain)) {
                return { error: "El formato de dominio web ingresado es inválido." };
            }
        }

        // Check if domain is already taken by another business
        if (cleanDomain) {
            const existing = await db.business.findFirst({
                where: {
                    domain: cleanDomain,
                    NOT: { id: businessId }
                }
            });
            if (existing) {
                return { error: "Este dominio ya está registrado por otro negocio." };
            }
        }

        await db.business.update({
            where: { id: businessId },
            data: { 
                name: name.trim(),
                domain: cleanDomain
            },
        });

        revalidatePath("/dashboard/settings");
        return { success: true };
    } catch (error) {
        console.error("[UPDATE_BUSINESS]", error);
        return { error: "Ocurrió un error al actualizar el negocio" };
    }
}
