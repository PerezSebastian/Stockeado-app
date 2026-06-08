"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";

import { UserRole } from "@prisma/client";

export async function getPurchases(page: number = 1, limit: number = 10) {
    const session = await auth();
    if (!session?.user) return { error: "No autorizado" };

    const isAdmin = session.user.role === UserRole.ADMIN;
    const businessIdQuery = isAdmin ? undefined : session.user.businessId;

    try {
        const skip = (page - 1) * limit;

        const whereClause = { businessId: businessIdQuery };

        const [totalCount, purchases] = await db.$transaction([
            db.purchase.count({ where: whereClause }),
            db.purchase.findMany({
                where: whereClause,
                include: {
                    items: {
                        include: { product: true }
                    },
                    business: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            })
        ]);

        const serializedPurchases = purchases.map((purchase) => ({
            ...purchase,
            total: Number(purchase.total),
            items: purchase.items.map((item) => ({
                ...item,
                unitCost: Number(item.unitCost),
                product: {
                    ...item.product,
                    price: Number(item.product.price),
                    cost: Number(item.product.cost),
                }
            })),
        }));

        const totalPages = Math.ceil(totalCount / limit);

        return { purchases: serializedPurchases, totalCount, totalPages };
    } catch (error) {
        console.error("Error obteniendo compras:", error);
        return { error: "Error al cargar el historial de compras." };
    }
}

export async function createPurchaseAction(
    items: { productId: string; quantity: number; unitCost: number }[],
    total: number,
    supplierName?: string,
    notes?: string
) {
    const session = await auth();
    if (!session?.user) return { error: "No autorizado" };

    try {
        return await db.$transaction(async (tx) => {
            // Create the Purchase header
            const newPurchase = await tx.purchase.create({
                data: {
                    businessId: session.user.businessId,
                    total: total,
                    supplierName: supplierName || null,
                    notes: notes || null,
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitCost: item.unitCost,
                        }))
                    }
                }
            });

            // For each item, increase the Product stock and log a StockMovement
            for (const item of items) {
                // Update Stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { increment: item.quantity }
                    }
                });

                // Insert Stock Movement log
                await tx.stockMovement.create({
                    data: {
                        type: "IN",
                        quantity: item.quantity,
                        reason: `Restock de compra ${supplierName ? `a ${supplierName}` : ''}`,
                        productId: item.productId,
                        businessId: session.user.businessId,
                    }
                });
            }

            return { success: "Compra registrada y stock actualizado con éxito." };
        });
    } catch (error) {
        console.error("Error al registrar compra:", error);
        return { error: "Error al registrar la compra. Intente nuevamente." };
    }
}
