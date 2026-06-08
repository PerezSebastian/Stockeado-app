"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const registerSchema = z.object({
    businessName: z.string().min(2, "El nombre del negocio debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    registrationKey: z.string().min(1, "La clave de registro es requerida"),
});

export async function registerAction(values: z.infer<typeof registerSchema>) {
    const validatedFields = registerSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Campos inválidos" };
    }

    const { businessName, email, password, registrationKey } = validatedFields.data;

    // First validate the registration key
    const requiredKey = process.env.REGISTRATION_KEY;
    if (!requiredKey) {
        return { error: "Error de configuración en el servidor. Falta la clave de registro." };
    }

    if (registrationKey !== requiredKey) {
        return { error: "La clave de registro ingresada es inválida." };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return { error: "El email ya está registrado" };
    }

    try {
        // Generate a slug from business name
        const slug = businessName
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");

        // Check if slug exists, if so append random string
        let finalSlug = slug;
        const existingBusiness = await db.business.findUnique({
            where: { slug },
        });

        if (existingBusiness) {
            finalSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
        }

        const crypto = await import("crypto");
        const apiKey = "sk_" + crypto.randomUUID().replace(/-/g, "");

        // Use a transaction to create both Business and User
        await db.$transaction(async (tx) => {
            const business = await tx.business.create({
                data: {
                    name: businessName,
                    slug: finalSlug,
                    apiKey,
                },
            });

            await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: "OWNER",
                    businessId: business.id,
                },
            });
        });
    } catch (error) {
        console.error("Register Database Error:", error);
        return { error: "Ocurrió un error al crear la cuenta" };
    }

    // Auto-login after successful registration
    // signIn redirects by throwing a NEXT_REDIRECT. It must be executed outside
    // the generic try-catch block that returns JSON error responses.
    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo: "/dashboard?registered=true",
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return { error: "Cuenta creada pero hubo un error al iniciar sesión automáticamente. Intentá loguearte manualmente." };
        }
        throw error;
    }

    return { success: "¡Registro exitoso!" };
}
