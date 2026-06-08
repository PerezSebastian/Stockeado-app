"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const DEFAULT_EXPENSE_CATEGORIES = [
    "LUZ", "GAS", "INTERNET", "ALQUILER", "AGUA", "SUELDOS", "IMPUESTOS", "OTROS"
];

export async function getCategories(type?: 'PRODUCT' | 'EXPENSE') {
    try {
        const session = await auth();
        if (!session?.user?.businessId) return { error: "No autorizado" };

        const businessId = session.user.businessId;

        // Si es para Gastos, nos aseguramos de que existan las clásicas
        if (type === 'EXPENSE' || !type) {
            const existing = await db.category.findMany({
                where: { businessId, type: 'EXPENSE' },
                select: { name: true }
            });
            const existingNames = new Set(existing.map(e => e.name.toUpperCase()));
            
            const missing = DEFAULT_EXPENSE_CATEGORIES.filter(cat => !existingNames.has(cat));
            
            if (missing.length > 0) {
                await db.category.createMany({
                    data: missing.map(name => ({
                        name,
                        type: 'EXPENSE',
                        businessId,
                        isActive: true
                    })) as any
                });
            }
        }

        const categories = await db.category.findMany({
            where: {
                businessId: session.user.businessId,
                type: type || undefined,
            },
            orderBy: { name: 'asc' }
        });

        // Aseguramos que isActive esté presente incluso si Prisma no regeneró (TS safety)
        return { 
            categories: categories.map(c => ({
                ...c,
                isActive: (c as any).isActive !== undefined ? (c as any).isActive : true
            }))
        };
    } catch (error) {
        console.error("Error al obtener categorías:", error);
        return { error: "Error al obtener categorías" };
    }
}

export async function toggleCategoryStatus(id: string, isActive: boolean) {
    try {
        const session = await auth();
        if (!session?.user?.businessId) return { error: "No autorizado" };

        await db.category.update({
            where: { id, businessId: session.user.businessId },
            data: { isActive } as any
        });

        revalidatePath("/dashboard/settings/categories");
        return { success: true };
    } catch (error) {
        return { error: "Error al cambiar estado de categoría" };
    }
}

export async function createCategory(name: string, type: 'PRODUCT' | 'EXPENSE') {
    try {
        const session = await auth();
        if (!session?.user?.businessId) return { error: "No autorizado" };

        const businessId = session.user.businessId;

        // Check for duplicates
        const existing = await db.category.findFirst({
            where: {
                businessId,
                name: name.trim(),
                type
            }
        });

        if (existing) {
            return { error: "Ya existe una categoría con ese nombre" };
        }

        await db.category.create({
            data: {
                name: name.trim(),
                type,
                businessId
            }
        });

        revalidatePath("/dashboard/settings/categories");
        return { success: true };
    } catch (error) {
        return { error: "Error al crear categoría" };
    }
}

export async function deleteCategory(id: string) {
    try {
        const session = await auth();
        if (!session?.user?.businessId) return { error: "No autorizado" };

        // Check if category is in use
        const inUseProduct = await db.product.findFirst({ where: { categoryId: id } });
        const inUseExpense = await db.fixedExpense.findFirst({ where: { categoryId: id } });

        if (inUseProduct || inUseExpense) {
            return { error: "No se puede eliminar la categoría porque está siendo usada por productos o gastos" };
        }

        await db.category.delete({
            where: { id, businessId: session.user.businessId }
        });

        revalidatePath("/dashboard/settings/categories");
        return { success: true };
    } catch (error) {
        return { error: "Error al eliminar categoría" };
    }
}
