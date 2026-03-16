"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Product } from "@prisma/client";

const ProductSchema = z.object({
    name: z.string().min(1, "El nombre es requerido").max(200, "El nombre es demasiado largo"),
    sku: z.string().max(100, "El SKU es demasiado largo").optional(),
    category: z.string().max(100, "La categoría es demasiado larga").optional(),
    cost: z.coerce.number().min(0, "El costo no puede ser negativo"),
    price: z.coerce.number().min(0, "El precio no puede ser negativo"),
    stock: z.coerce.number().int().min(0, "El stock no puede ser negativo"),
    minStock: z.coerce.number().int().min(0, "El stock mínimo no puede ser negativo"),
    isPublic: z.boolean().default(false),
});

function serializeProduct(p: Product) {
    return {
        ...p,
        cost: Number(p.cost),
        price: Number(p.price),
    };
}

export async function getProducts(query?: string, page: number = 1, limit: number = 10) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado o sin negocio vinculado" };
    }

    try {
        const skip = (page - 1) * limit;

        const whereClause: any = {
            businessId: session.user.businessId,
        };

        if (query) {
            whereClause.OR = [
                { name: { contains: query } },
                { sku: { contains: query } },
            ];
        }

        const [totalCount, rawProducts] = await db.$transaction([
            db.product.count({ where: whereClause }),
            db.product.findMany({
                where: whereClause,
                orderBy: {
                    createdAt: "desc"
                },
                skip,
                take: limit,
            })
        ]);

        const products = rawProducts.map(serializeProduct);
        const totalPages = Math.ceil(totalCount / limit);

        return { products, totalCount, totalPages };
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
        const firstError = validatedFields.error.issues[0];
        return { error: firstError?.message ?? "Campos inválidos" };
    }

    const { name, sku, category, cost, price, stock, minStock, isPublic } = validatedFields.data;
    const businessId = session.user.businessId!;

    // ── Validación: SKU único dentro del negocio ──
    if (sku && sku.trim() !== "") {
        const skuConflict = await db.product.findFirst({
            where: { sku: sku.trim(), businessId },
        });
        if (skuConflict) {
            return { error: `El SKU "${sku.trim()}" ya está en uso por el producto "${skuConflict.name}"` };
        }
    }

    // ── Advertencia: precio menor al costo (no bloqueo) ──
    const priceWarning = price < cost
        ? `⚠️ El precio de venta ($${price}) es menor al costo ($${cost}).`
        : undefined;

    try {
        const product = await db.$transaction(async (tx) => {
            const newProduct = await tx.product.create({
                data: {
                    name: name.trim(),
                    sku: sku?.trim() || null,
                    category: category?.trim() || null,
                    cost,
                    price,
                    stock,
                    minStock,
                    isPublic,
                    businessId,
                }
            });

            if (stock > 0) {
                await tx.stockMovement.create({
                    data: {
                        productId: newProduct.id,
                        businessId,
                        type: "IN",
                        quantity: stock,
                        reason: "Stock inicial",
                    }
                });
            }

            return newProduct;
        });

        revalidatePath("/dashboard/inventory");
        return {
            success: "Producto creado con éxito",
            warning: priceWarning,
            product: serializeProduct(product),
        };
    } catch (error) {
        console.error("CREATE_PRODUCT_ERROR", error);
        return { error: "Error al crear el producto" };
    }
}

export async function updateProduct(id: string, values: z.infer<typeof ProductSchema>) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }

    const validatedFields = ProductSchema.safeParse(values);
    if (!validatedFields.success) {
        const firstError = validatedFields.error.issues[0];
        return { error: firstError?.message ?? "Campos inválidos" };
    }

    const { name, sku, category, cost, price, stock, minStock, isPublic } = validatedFields.data;
    const businessId = session.user.businessId!;

    // ── Verificar que el producto existe, pertenece al negocio y no está dado de baja ──
    const existing = await db.product.findFirst({
        where: { id, businessId },
    });
    if (!existing) {
        return { error: "Producto no encontrado" };
    }
    if (existing.isDeleted) {
        return { error: "No se puede editar un producto dado de baja. Habilitalo primero desde el inventario." };
    }

    // ── Validación: SKU único (excluyendo el propio producto) ──
    if (sku && sku.trim() !== "") {
        const skuConflict = await db.product.findFirst({
            where: { sku: sku.trim(), businessId, NOT: { id } },
        });
        if (skuConflict) {
            return { error: `El SKU "${sku.trim()}" ya está en uso por el producto "${skuConflict.name}"` };
        }
    }

    // ── Advertencia: precio menor al costo ──
    const priceWarning = price < cost
        ? `⚠️ El precio de venta ($${price}) es menor al costo ($${cost}).`
        : undefined;

    try {
        const product = await db.product.update({
            where: { id, businessId },
            data: {
                name: name.trim(),
                sku: sku?.trim() || null,
                category: category?.trim() || null,
                cost,
                price,
                stock,
                minStock,
                isPublic,
            },
        });

        revalidatePath("/dashboard/inventory");
        return {
            success: "Producto actualizado con éxito",
            warning: priceWarning,
            product: serializeProduct(product),
        };
    } catch (error) {
        console.error("UPDATE_PRODUCT_ERROR", error);
        return { error: "Error al actualizar el producto" };
    }
}

export async function deleteProduct(id: string) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }

    const businessId = session.user.businessId!;

    // ── Verificar existencia y pertenencia ──
    const existing = await db.product.findFirst({
        where: { id, businessId },
    });
    if (!existing) {
        return { error: "Producto no encontrado" };
    }
    if (existing.isDeleted) {
        return { error: "El producto ya estaba dado de baja" };
    }

    try {
        await db.product.update({
            where: { id },
            data: { isDeleted: true },
        });

        revalidatePath("/dashboard/inventory");
        return { success: "Producto dado de baja con éxito" };
    } catch (error) {
        console.error("DELETE_PRODUCT_ERROR", error);
        return { error: "Error al dar de baja el producto" };
    }
}

export async function restoreProduct(id: string) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }

    const businessId = session.user.businessId!;

    // ── Verificar existencia y pertenencia ──
    const existing = await db.product.findFirst({
        where: { id, businessId },
    });
    if (!existing) {
        return { error: "Producto no encontrado" };
    }
    if (!existing.isDeleted) {
        return { error: "El producto ya está habilitado" };
    }

    try {
        await db.product.update({
            where: { id },
            data: { isDeleted: false },
        });

        revalidatePath("/dashboard/inventory");
        return { success: "Producto habilitado con éxito" };
    } catch (error) {
        console.error("RESTORE_PRODUCT_ERROR", error);
        return { error: "Error al habilitar el producto" };
    }
}

export async function adjustStock(productId: string, newStock: number, reason: string) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }

    if (newStock < 0) return { error: "El stock no puede ser negativo" };

    const businessId = session.user.businessId!;

    try {
        const result = await db.$transaction(async (tx) => {
            const product = await tx.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                return { error: "Producto no encontrado" };
            }

            if (product.businessId !== businessId) {
                return { error: "No autorizado" };
            }

            if (product.isDeleted) {
                return { error: "No se puede ajustar el stock de un producto dado de baja" };
            }

            const delta = newStock - product.stock;

            if (delta === 0) {
                return { success: true, product, noChange: true };
            }

            const updatedProduct = await tx.product.update({
                where: { id: productId },
                data: { stock: newStock },
            });

            await tx.stockMovement.create({
                data: {
                    productId,
                    businessId,
                    type: delta > 0 ? "IN" : "OUT",
                    quantity: Math.abs(delta),
                    reason: reason.trim() || "Sin motivo",
                },
            });

            return { success: true, product: updatedProduct };
        });

        if (result.error) return result;
        if (result.noChange) return { success: "Sin cambios en el stock" };

        revalidatePath("/dashboard/inventory");
        return { success: "Stock actualizado" };
    } catch (error) {
        console.error("ADJUST_STOCK_ERROR", error);
        return { error: "Error al ajustar el stock" };
    }
}
