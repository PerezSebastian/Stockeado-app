"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { startOfDay, startOfMonth, startOfYear, subDays } from "date-fns";

export type AnalyticsPeriod = "TODAY" | "7_DAYS" | "THIS_MONTH" | "THIS_YEAR" | "ALL_TIME";

export async function getAnalyticsData(period: AnalyticsPeriod) {
    const session = await auth();
    if (!session?.user) return { error: "No autorizado" };

    const isAdmin = session.user.role === "ADMIN";
    const businessIdQuery = isAdmin ? undefined : session.user.businessId;

    let startDate: Date | undefined = undefined;
    const now = new Date();

    switch (period) {
        case "TODAY":
            startDate = startOfDay(now);
            break;
        case "7_DAYS":
            startDate = startOfDay(subDays(now, 7));
            break;
        case "THIS_MONTH":
            startDate = startOfMonth(now);
            break;
        case "THIS_YEAR":
            startDate = startOfYear(now);
            break;
        case "ALL_TIME":
            startDate = undefined;
            break;
    }

    try {
        const dateFilter = startDate ? { createdAt: { gte: startDate } } : {};

        // 1. Fetch sales in period
        const sales = await db.sale.findMany({
            where: {
                businessId: businessIdQuery,
                ...dateFilter,
            },
            include: {
                items: {
                    include: { product: true }
                }
            },
            orderBy: { createdAt: "asc" }
        });

        // Calculations

        // Variables
        let totalRevenue = 0;
        let totalTickets = sales.length;

        const productsMap = new Map<string, { name: string; qty: number; revenue: number }>();
        const hoursMap = new Map<number, { tickets: number; revenue: number }>();
        const paymentMap = new Map<string, { count: number; revenue: number }>();
        // Let's modify timeMap to group by day uniformly, or exact hour for TODAY
        const timeMap = new Map<string | number, { revenue: number; tickets: number }>();

        // Init generic hours mapping 0 to 23
        for (let i = 0; i < 24; i++) {
            hoursMap.set(i, { tickets: 0, revenue: 0 });
        }

        sales.forEach(sale => {
            const saleTotal = Number(sale.total);
            totalRevenue += saleTotal;

            // Payment Methods
            const method = sale.paymentMethod || "Otro";
            const prevMethod = paymentMap.get(method) || { count: 0, revenue: 0 };
            paymentMap.set(method, { count: prevMethod.count + 1, revenue: prevMethod.revenue + saleTotal });

            // Sales By Hour (Histogram)
            const d = new Date(sale.createdAt);
            const hour = d.getHours();
            const prevHour = hoursMap.get(hour)!;
            hoursMap.set(hour, { tickets: prevHour.tickets + 1, revenue: prevHour.revenue + saleTotal });

            // Revenue Over Time
            let timeKey: string | number;

            if (period === "TODAY") {
                // Group by hour. UNIX timestamp of the hour in local time, converted to seconds.
                const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 0, 0);
                // TV requires UTC timestamp. We'll simply use value / 1000 but shift it logically if needed. Using straight Date / 1000 is fine if client maps it.
                timeKey = Math.floor(dt.getTime() / 1000);
            } else {
                // YYYY-MM-DD string is native for TradingView business days
                timeKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            }

            const prevTime = timeMap.get(timeKey) || { revenue: 0, tickets: 0 };
            timeMap.set(timeKey, { revenue: prevTime.revenue + saleTotal, tickets: prevTime.tickets + 1 });

            // Products
            sale.items.forEach(item => {
                const prodName = item.product.name;
                const prevProd = productsMap.get(prodName) || { name: prodName, qty: 0, revenue: 0 };
                productsMap.set(prodName, {
                    name: prodName,
                    qty: prevProd.qty + item.quantity,
                    revenue: prevProd.revenue + (Number(item.unitPrice) * item.quantity),
                });
            });
        });

        // Sort Top/Bottom Products
        const sortedProducts = Array.from(productsMap.values()).sort((a, b) => b.qty - a.qty);
        const topProducts = sortedProducts.slice(0, 5);
        const bottomProducts = [...sortedProducts].reverse().slice(0, 5);

        // Format for UI/Chart (Payment)
        const paymentData = Array.from(paymentMap.entries()).map(([name, data]) => ({
            name,
            value: data.revenue,
            count: data.count
        }));

        // Format for Lightweight Charts (Histogram)
        const hoursData = Array.from(hoursMap.entries()).map(([hour, data]) => {
            // Convert hour to a fake unix timestamp representing today at that hour
            const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
            return {
                time: Math.floor(dt.getTime() / 1000),
                value: data.revenue,
                clientes: data.tickets
            };
        }).sort((a, b) => a.time - b.time);

        // Sort timeMap chronologically for Revenue
        const revenueData = Array.from(timeMap.entries())
            .map(([time, data]) => ({
                time: time,
                value: data.revenue,
                tickets: data.tickets
            }))
            .sort((a, b) => {
                if (typeof a.time === "number" && typeof b.time === "number") return a.time - b.time;
                return String(a.time).localeCompare(String(b.time));
            });

        return {
            success: true,
            data: {
                totalRevenue,
                totalTickets,
                topProducts,
                bottomProducts,
                paymentData,
                hoursData,
                revenueData
            }
        };

    } catch (error) {
        console.error("Error obteniendo analiticas:", error);
        return { error: "Error al generar las analíticas." };
    }
}
