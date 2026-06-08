"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getPaymentMethods() {
    try {
        const session = await auth();
        if (!session?.user?.businessId) return { error: "No autorizado" };

        const methods = await db.paymentMethod.findMany({
            where: {
                businessId: session.user.businessId,
            },
            orderBy: { createdAt: 'asc' }
        });

        return { methods };
    } catch (error) {
        return { error: "Error al obtener métodos de pago" };
    }
}

export async function createPaymentMethod(name: string) {
    try {
        const session = await auth();
        if (!session?.user?.businessId) return { error: "No autorizado" };

        const businessId = session.user.businessId;

        const existing = await db.paymentMethod.findFirst({
            where: {
                businessId,
                name: name.trim()
            }
        });

        if (existing) {
            return { error: "Ya existe un método con ese nombre" };
        }

        await db.paymentMethod.create({
            data: {
                name: name.trim(),
                businessId
            }
        });

        revalidatePath("/dashboard/settings/payments");
        return { success: true };
    } catch (error) {
        return { error: "Error al crear método de pago" };
    }
}

export async function togglePaymentMethodStatus(id: string, currentStatus: boolean) {
    try {
        const session = await auth();
        if (!session?.user?.businessId) return { error: "No autorizado" };

        await db.paymentMethod.update({
            where: { id, businessId: session.user.businessId },
            data: { isActive: !currentStatus }
        });

        revalidatePath("/dashboard/settings/payments");
        return { success: true };
    } catch (error) {
        return { error: "Error al actualizar estado" };
    }
}

export async function deletePaymentMethod(id: string) {
    try {
        const session = await auth();
        if (!session?.user?.businessId) return { error: "No autorizado" };

        // Check usage
        const inUse = await db.sale.findFirst({ where: { paymentMethodId: id } });
        if (inUse) {
            return { error: "No se puede eliminar porque tiene ventas asociadas. Desactívalo en su lugar." };
        }

        await db.paymentMethod.delete({
            where: { id, businessId: session.user.businessId }
        });

        revalidatePath("/dashboard/settings/payments");
        return { success: true };
    } catch (error) {
        return { error: "Error al eliminar método de pago" };
    }
}
