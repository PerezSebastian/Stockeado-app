"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

// Get all users with their associated business.
export async function getUsers(): Promise<{ error: string } | {
    users: Prisma.UserGetPayload<{
        include: {
            business: {
                include: {
                    users: {
                        select: { email: true }
                    }
                }
            }
        }
    }>[]
}> {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return { error: "No autorizado" };
    }

    const users = await db.user.findMany({
        include: {
            business: {
                include: {
                    users: {
                        select: { email: true }
                    }
                }
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return { users };
}

export async function toggleUserStatusAction(userId: string, currentStatus: boolean) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return { error: "No autorizado" };
    }

    try {
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) return { error: "Usuario no encontrado" };

        // Prevent master admin from being disabled
        if (user.email === "admin@galape.com" && currentStatus === true) {
            return { error: "No se puede desactivar el administrador maestro." };
        }

        const newStatus = !currentStatus;
        const updateData: Prisma.UserUpdateInput = {
            isActive: newStatus
        };

        await db.user.update({
            where: { id: userId },
            data: updateData,
        });

        return { success: `Usuario ${newStatus ? "activado" : "desactivado"} con éxito` };
    } catch (error) {
        console.error("Toggle user status error:", error);
        return { error: "Error al actualizar el estado del usuario" };
    }
}

// Toggle business status (Logical deletion for the whole business)
export async function toggleBusinessStatusAction(businessId: string, currentStatus: "ACTIVE" | "INACTIVE") {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return { error: "No autorizado" };
    }

    try {
        const business = await db.business.findUnique({
            where: { id: businessId },
            include: { users: { select: { email: true } } },
        });

        if (!business) return { error: "Negocio no encontrado" };

        // Prevent master admin business from being disabled
        const isMaster = business.users.some(u => u.email === "admin@galape.com");
        if (isMaster && business.planStatus === "ACTIVE") {
            return { error: "No se puede dar de baja el negocio administrador maestro." };
        }

        const newStatus = business.planStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        const newIsActive = newStatus === "ACTIVE";

        const userUpdateData: Prisma.UserUpdateManyMutationInput = {
            isActive: newIsActive
        };

        await db.$transaction([
            db.business.update({
                where: { id: businessId },
                data: { planStatus: newStatus },
            }),
            db.user.updateMany({
                where: { businessId: businessId },
                data: userUpdateData
            }),
        ]);

        return { success: `Negocio y todos sus usuarios actualizados a ${newStatus === "ACTIVE" ? "ACTIVO" : "INACTIVO"}` };
    } catch (error) {
        console.error("Toggle business status error:", error);
        return { error: "Error al actualizar el estado" };
    }
}

// Get all businesses for the select dropdown
export async function getBusinesses() {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return { error: "No autorizado" };
    }

    const businesses = await db.business.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
    });

    return { businesses };
}

const createUserSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    role: z.enum(["ADMIN", "VENDEDOR"]),
    businessId: z.string().min(1, "Selecciona un negocio"),
    newBusinessName: z.string().optional(),
});

export async function createUserAction(values: z.infer<typeof createUserSchema>) {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
        return { error: "No autorizado" };
    }

    const validatedFields = createUserSchema.safeParse(values);
    if (!validatedFields.success) {
        return { error: "Campos inválidos" };
    }

    const { email, password, role, businessId, newBusinessName } = validatedFields.data;

    // Check if email is already taken
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
        return { error: "Este email ya está registrado" };
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let finalBusinessId = businessId;

        return await db.$transaction(async (tx) => {
            // If creating a new business
            if (businessId === "new") {
                if (!newBusinessName) throw new Error("Nombre del nuevo negocio es requerido");

                const slug = newBusinessName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

                const newBusiness = await tx.business.create({
                    data: {
                        name: newBusinessName,
                        slug: `${slug}-${Math.floor(Math.random() * 1000)}`, // Avoid conflicts
                    }
                });
                finalBusinessId = newBusiness.id;
            } else {
                // Verify business exists
                const business = await tx.business.findUnique({ where: { id: businessId } });
                if (!business) throw new Error("Negocio no encontrado");
            }

            await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role,
                    businessId: finalBusinessId,
                },
            });

            return { success: `Usuario ${email} creado con éxito${businessId === "new" ? " junto con su negocio" : ""}.` };
        });
    } catch (error) {
        console.error("Create user error:", error);
        return { error: error instanceof Error ? error.message : "Ocurrió un error al crear el usuario" };
    }
}
