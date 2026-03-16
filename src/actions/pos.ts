"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function getPOSProducts() {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }

    try {
        const rawProducts = await db.product.findMany({
            where: {
                businessId: session.user.businessId,
                isDeleted: false,
            },
            orderBy: { name: "asc" },
        });

        const products = rawProducts.map((p) => ({
            ...p,
            cost: Number(p.cost),
            price: Number(p.price),
        }));

        return { products };
    } catch (error) {
        console.error("GET_POS_PRODUCTS_ERROR", error);
        return { error: "Error al cargar los productos" };
    }
}

const ALLOWED_PAYMENT_METHODS = ["Efectivo", "Débito", "Crédito", "Transferencia"] as const;

const CartItemSchema = z.object({
    productId: z.string().uuid("ID de producto inválido"),
    quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
    unitPrice: z.number().nonnegative("El precio no puede ser negativo"),
});

const CreateSaleSchema = z.object({
    items: z
        .array(CartItemSchema)
        .min(1, "El carrito no puede estar vacío")
        .refine(
            (items) => new Set(items.map((i) => i.productId)).size === items.length,
            "No puede haber productos duplicados en el carrito"
        ),
    paymentMethod: z.string().refine(
        (v) => ALLOWED_PAYMENT_METHODS.includes(v as typeof ALLOWED_PAYMENT_METHODS[number]),
        { message: "Método de pago no válido" }
    ),
    notes: z.string().max(500, "Las notas no pueden superar los 500 caracteres").optional(),
});

export async function createSale(input: z.infer<typeof CreateSaleSchema>) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado" };
    }

    const validated = CreateSaleSchema.safeParse(input);
    if (!validated.success) {
        const firstError = validated.error.issues[0];
        return { error: firstError?.message ?? "Datos de venta inválidos" };
    }

    const { items, paymentMethod, notes } = validated.data;
    const businessId = session.user.businessId!;

    // ── Verificar productos en la BD (pertenencia, estado, stock y precio) ──
    const productIds = items.map((i) => i.productId);
    const dbProducts = await db.product.findMany({
        where: { id: { in: productIds }, businessId, isDeleted: false },
    });

    // 1. Todos los IDs deben existir y pertenecer al negocio
    if (dbProducts.length !== productIds.length) {
        const foundIds = new Set(dbProducts.map((p) => p.id));
        const missing = productIds.find((id) => !foundIds.has(id));
        return { error: `Producto no encontrado o dado de baja (ID: ${missing?.slice(-6)})` };
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    for (const item of items) {
        const product = productMap.get(item.productId)!;

        // 2. Stock suficiente
        if (product.stock < item.quantity) {
            return {
                error: `Stock insuficiente para "${product.name}": disponibles ${product.stock}, solicitados ${item.quantity}.`,
            };
        }

        // 3. Precio íntegro — previene manipulación del precio desde el cliente
        const realPrice = Number(product.price);
        const priceDiff = Math.abs(realPrice - item.unitPrice);
        if (priceDiff > 0.01) {
            return {
                error: `El precio de "${product.name}" no coincide con el registrado ($${realPrice.toLocaleString("es-AR")}). Recargá la página e intentá de nuevo.`,
            };
        }
    }

    const total = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

    try {
        await db.$transaction(async (tx) => {
            const sale = await tx.sale.create({
                data: {
                    total,
                    paymentMethod,
                    notes,
                    businessId,
                    items: {
                        create: items.map((i) => ({
                            productId: i.productId,
                            quantity: i.quantity,
                            unitPrice: i.unitPrice,
                        })),
                    },
                },
            });

            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                });

                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        businessId,
                        type: "OUT",
                        quantity: item.quantity,
                        reason: `Venta #${sale.id.slice(-6).toUpperCase()}`,
                    },
                });
            }
        });

        revalidatePath("/dashboard/pos");
        revalidatePath("/dashboard/inventory");
        return { success: "Venta registrada con éxito" };
    } catch (error) {
        console.error("CREATE_SALE_ERROR", error);
        return { error: "Error al registrar la venta. Intentá de nuevo." };
    }
}
