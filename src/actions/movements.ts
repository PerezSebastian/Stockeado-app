"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function getStockMovements(query?: string, page = 1, limit = 10) {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado o sin negocio vinculado" };
    }

    try {
        const offset = (page - 1) * limit;

        const where = {
            businessId: session.user.businessId,
            ...(query
                ? {
                    OR: [
                        {
                            product: {
                                name: { contains: query },
                            },
                        },
                        {
                            product: {
                                sku: { contains: query },
                            },
                        },
                        { reason: { contains: query } },
                    ],
                }
                : {}),
        };

        const [movements, totalCount] = await Promise.all([
            db.stockMovement.findMany({
                where,
                include: {
                    product: {
                        select: {
                            name: true,
                            sku: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                skip: offset,
                take: limit,
            }),
            db.stockMovement.count({ where }),
        ]);

        return {
            movements,
            totalCount,
            totalPages: Math.ceil(totalCount / limit)
        };
    } catch (error) {
        console.error("GET_MOVEMENTS_ERROR", error);
        return { error: "Error al obtener los movimientos de stock" };
    }
}
