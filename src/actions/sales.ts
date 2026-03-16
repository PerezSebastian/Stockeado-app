"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import type { SerializedSale } from "@/types/sales";

interface GetSalesResult {
    sales: SerializedSale[];
    totalCount: number;
    totalPages: number;
}

export async function getSales(
    query?: string,
    page: number = 1,
    limit: number = 10
): Promise<GetSalesResult | { error: string }> {
    const session = await auth();
    if (!session?.user?.businessId) {
        return { error: "No autorizado o sin negocio vinculado" };
    }

    try {
        const skip = (page - 1) * limit;

        const whereClause = {
            businessId: session.user.businessId,
            ...(query
                ? {
                    OR: [
                        { id: { contains: query } },
                        { notes: { contains: query } },
                    ],
                }
                : {}),
        };

        const [totalCount, rawSales] = await db.$transaction([
            db.sale.count({ where: whereClause }),
            db.sale.findMany({
                where: whereClause,
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                    sku: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                skip,
                take: limit,
            })
        ]);

        // Serialize Prisma Decimals to plain numbers for Client Components
        const sales: SerializedSale[] = rawSales.map((sale) => ({
            ...sale,
            total: Number(sale.total),
            items: sale.items.map((item) => ({
                ...item,
                unitPrice: Number(item.unitPrice),
            })),
        }));

        const totalPages = Math.ceil(totalCount / limit);

        return { sales, totalCount, totalPages };
    } catch (error) {
        console.error("GET_SALES_ERROR", error);
        return { error: "Error al obtener el historial de ventas" };
    }
}
