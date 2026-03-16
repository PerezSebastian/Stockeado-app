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
});

export async function registerAction(values: z.infer<typeof registerSchema>) {
    const validatedFields = registerSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Campos inválidos" };
    }

    const { businessName, email, password } = validatedFields.data;
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

        // Use a transaction to create both Business and User
        await db.$transaction(async (tx) => {
            const business = await tx.business.create({
                data: {
                    name: businessName,
                    slug: finalSlug,
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

        // Auto-login after successful registration
        try {
            await signIn("credentials", {
                email,
                password,
                redirectTo: "/dashboard?registered=true",
            });
        } catch (error) {
            // signIn throws a NEXT_REDIRECT which is expected behavior
            if (error instanceof AuthError) {
                return { error: "Cuenta creada pero hubo un error al iniciar sesión automáticamente. Intentá loguearte manualmente." };
            }
            throw error;
        }

        return { success: "¡Registro exitoso!" };
    } catch (error) {
        console.error("Register Error:", error);
        return { error: "Ocurrió un error al crear la cuenta" };
    }
}
