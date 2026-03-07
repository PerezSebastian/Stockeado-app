"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ProductSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    sku: z.string().optional(),
    category: z.string().optional(),
    cost: z.coerce.number().min(0, "El costo debe ser positivo"),
    price: z.coerce.number().min(0, "El precio debe ser positivo"),
    stock: z.coerce.number().int().min(0, "El stock no puede ser negativo"),
    minStock: z.coerce.number().int().min(0, "El stock mínimo no puede ser negativo"),
    isPublic: z.boolean().default(false),
});

export async function getProducts() {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado o sin negocio vinculado" };
    }

    try {
        const products = await db.product.findMany({
            where: {
                businessId: session.user.businessId
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return { products };
    } catch (error) {
        console.error("GET_PRODUCTS_ERROR", error);
        return { error: "Error al obtener los productos" };
    }
}

export async function createProduct(values: z.infer<typeof ProductSchema>) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }

    const validatedFields = ProductSchema.safeParse(values);
    if (!validatedFields.success) {
        return { error: "Campos inválidos" };
    }

    const { name, sku, category, cost, price, stock, minStock, isPublic } = validatedFields.data;

    try {
        const product = await db.$transaction(async (tx) => {
            const newProduct = await tx.product.create({
                data: {
                    name,
                    sku,
                    category,
                    cost,
                    price,
                    stock,
                    minStock,
                    isPublic,
                    businessId: session.user.businessId!,
                }
            });

            // Initial stock movement
            if (stock > 0) {
                await tx.stockMovement.create({
                    data: {
                        productId: newProduct.id,
                        businessId: session.user.businessId!,
                        type: "IN",
                        quantity: stock,
                        reason: "Stock inicial",
                    }
                });
            }

            return newProduct;
        });

        revalidatePath("/dashboard/inventory");
        return { success: "Producto creado con éxito", product };
    } catch (error) {
        console.error("CREATE_PRODUCT_ERROR", error);
        return { error: "Error al crear el producto" };
    }
}

export async function deleteProduct(id: string) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }

    try {
        await db.product.delete({
            where: {
                id,
                businessId: session.user.businessId // Security: ensuring it belongs to the business
            }
        });

        revalidatePath("/dashboard/inventory");
        return { success: "Producto eliminado con éxito" };
    } catch (error) {
        console.error("DELETE_PRODUCT_ERROR", error);
        return { error: "Error al eliminar el producto" };
    }
}
