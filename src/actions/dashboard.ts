"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function getDashboardStats() {
    const session = await auth();
    if (!session?.user) {
        return { error: "No autorizado" };
    }

    const isAdmin = session.user.role === "ADMIN";
    const businessIdQuery = isAdmin ? undefined : session.user.businessId;

    try {
        // Today's date range
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch Total Sales today
        const todaysSales = await db.sale.findMany({
            where: {
                businessId: businessIdQuery,
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            select: { total: true },
        });

        const totalSalesToday = todaysSales.reduce((sum, sale) => sum + Number(sale.total), 0);
        const ticketsToday = todaysSales.length;

        // Fetch Critical Stock products
        const criticalStockProducts = await db.product.count({
            where: {
                businessId: businessIdQuery,
                isDeleted: false,
                stock: { lte: db.product.fields.minStock } // Assuming minStock exists
            },
        });

        // Fetch Active Products count
        const activeProducts = await db.product.count({
            where: {
                businessId: businessIdQuery,
                isDeleted: false,
            },
        });

        // Fetch Recent Sales (Last 5)
        const recentSales = await db.sale.findMany({
            where: { businessId: businessIdQuery },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
                items: {
                    include: { product: { select: { name: true } } }
                }
            }
        });

        // Fetch Recent Movements (Last 5)
        const recentMovements = await db.stockMovement.findMany({
            where: { businessId: businessIdQuery },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
                product: { select: { name: true } }
            }
        });

        return {
            totalSalesToday,
            ticketsToday,
            criticalStockProducts,
            activeProducts,
            recentSales,
            recentMovements,
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return { error: "Error al cargar las estadísticas" };
    }
}
