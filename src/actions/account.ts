"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function updateAccountEmail(email: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "No autorizado" };
        }

        const userId = session.user.id;
        const normalizedEmail = email.toLowerCase().trim();

        if (!normalizedEmail || normalizedEmail.length === 0) {
            return { error: "El email es requerido" };
        }

        // Check if email is already taken by ANOTHER user
        const existingUser = await db.user.findFirst({
            where: {
                email: normalizedEmail,
                NOT: { id: userId }
            }
        });

        if (existingUser) {
            return { error: "Ese email ya está en uso por otra cuenta" };
        }

        await db.user.update({
            where: { id: userId },
            data: { email: normalizedEmail }
        });

        revalidatePath("/dashboard/settings/account");
        return { success: "Email actualizado correctamente" };
    } catch (error) {
        console.error("[UPDATE_EMAIL]", error);
        return { error: "Error al actualizar el email" };
    }
}

export async function updatePassword(currentPassword: string, newPassword: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "No autorizado" };
        }

        const userId = session.user.id;

        const user = await db.user.findUnique({
            where: { id: userId },
            select: { password: true }
        });

        if (!user) {
            return { error: "Usuario no encontrado" };
        }

        // Use bcryptjs as requested/consistent
        const passwordsMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordsMatch) {
            return { error: "La contraseña actual es incorrecta" };
        }

        if (newPassword.length < 6) {
            return { error: "La nueva contraseña debe tener al menos 6 caracteres" };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        revalidatePath("/dashboard/settings/account");
        return { success: "Contraseña actualizada correctamente" };
    } catch (error) {
        console.error("[UPDATE_PASSWORD]", error);
        return { error: "Error al actualizar la contraseña" };
    }
}
