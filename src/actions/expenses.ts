"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { ExpenseCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getPaginatedExpenses(
    page: number = 1,
    limit: number = 10,
    filterType: "month" | "year" | "all" = "month",
    dateParam: string // ISO string of reference date
) {
    const session = await auth();
    if (!session?.user?.businessId) return { error: "No autorizado" };

    try {
        const skip = (page - 1) * limit;
        const refDate = new Date(dateParam);

        // Construir whereClause según el filtro
        const whereClause: any = {
            businessId: session.user.businessId,
            isDeleted: false
        };

        if (filterType === "month") {
            const startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
            const endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59);
            whereClause.dueDate = {
                gte: startDate,
                lte: endDate
            };
        } else if (filterType === "year") {
            const startDate = new Date(refDate.getFullYear(), 0, 1);
            const endDate = new Date(refDate.getFullYear(), 11, 31, 23, 59, 59);
            whereClause.dueDate = {
                gte: startDate,
                lte: endDate
            };
        }

        const [totalCount, rawExpenses] = await db.$transaction([
            db.fixedExpense.count({ where: whereClause }),
            db.fixedExpense.findMany({
                where: whereClause,
                orderBy: { dueDate: "desc" }, // Gastos más recientes primero en la tabla
                skip,
                take: limit,
            })
        ]);

        const serializedExpenses = rawExpenses.map(e => ({
            ...e,
            amount: Number(e.amount),
        }));

        const totalPages = Math.ceil(totalCount / limit);

        return { expenses: serializedExpenses, totalCount, totalPages };
    } catch (error) {
        console.error("Error obteniendo gastos paginados:", error);
        return { error: "Error al cargar la página de gastos fijos." };
    }
}

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export async function getExpenseMetrics(
    filterType: "month" | "year" | "all" = "month",
    dateParam: string // ISO string of reference date
) {
    const session = await auth();
    if (!session?.user?.businessId) return { error: "No autorizado" };

    try {
        const refDate = new Date(dateParam);
        const whereClause: any = {
            businessId: session.user.businessId,
            isDeleted: false
        };

        if (filterType === "month") {
            const startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
            const endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59);
            whereClause.dueDate = { gte: startDate, lte: endDate };
        } else if (filterType === "year") {
            const startDate = new Date(refDate.getFullYear(), 0, 1);
            const endDate = new Date(refDate.getFullYear(), 11, 31, 23, 59, 59);
            whereClause.dueDate = { gte: startDate, lte: endDate };
        }

        // Fetch solo los gastos que entran en la ventana de tiempo elegida
        // Como es para el gráfico, lamentablemente requerimos todos los de este mes/año.
        // Pero al menos procesamos en el backend y solo mandamos un pequeño JSON al cliente.
        const expenses = await db.fixedExpense.findMany({
            where: whereClause,
            orderBy: { dueDate: "asc" }
        });

        // 1. Cálculos de Cabecera (Summary)
        let totalGastos = 0;
        let totalPagado = 0;
        let totalPendiente = 0;

        // 2. Extracción de Pendientes para la Tabla Corta (Evita que el cliente lo procese)
        const unpaidExpenses = [];

        // 3. Agrupación para Charts
        const groups: Record<string, Record<string, number>> = {};
        const categoriesSet = new Set<string>();

        for (const e of expenses) {
            const amount = Number(e.amount);
            totalGastos += amount;
            if (e.isPaid) {
                totalPagado += amount;
            } else {
                totalPendiente += amount;
                unpaidExpenses.push({
                    ...e,
                    amount: amount
                });
            }

            // Agrupación de Gŕafico
            const date = new Date(e.dueDate);
            let timeKey = "";

            if (filterType === "month") {
                // Agrupar por día
                timeKey = format(date, "yyyy-MM-dd");
            } else {
                // Agrupar por mes
                timeKey = format(date, "yyyy-MM");
            }

            const cat = e.category || "Otros";
            categoriesSet.add(cat);

            if (!groups[timeKey]) groups[timeKey] = {};
            if (!groups[timeKey][cat]) groups[timeKey][cat] = 0;

            groups[timeKey][cat] += amount;
        }

        // Construir JSON ligero de ChartData
        const sortedTimeKeys = Object.keys(groups).sort();
        const categories = Array.from(categoriesSet);

        let chartData: any[] = [];

        if (filterType === "month") {
            // El usuario quiere ver las categorías, no los días
            const catTotals: Record<string, number> = {};
            for (const tk of sortedTimeKeys) {
                for (const cat of categories) {
                    if (groups[tk][cat]) {
                        catTotals[cat] = (catTotals[cat] || 0) + groups[tk][cat];
                    }
                }
            }
            chartData = Object.keys(catTotals).map(cat => ({
                label: cat,
                amount: catTotals[cat],
            })).sort((a, b) => b.amount - a.amount);
        } else {
            chartData = sortedTimeKeys.map(timeKey => {
                const dataPoint: any = {
                    timeKey,
                    label: format(parseISO(timeKey + "-01"), "MMM yy", { locale: es }),
                    totalAmount: 0
                };

                let total = 0;
                categories.forEach(cat => {
                    const amount = groups[timeKey][cat] || 0;
                    dataPoint[cat] = amount;
                    total += amount;
                });
                dataPoint.totalAmount = total;

                return dataPoint;
            });
        }

        return {
            summary: {
                totalGastos,
                totalPagado,
                totalPendiente,
            },
            unpaidExpenses,
            chartData,
            uniqueCategories: categories
        };
    } catch (error) {
        console.error("Error obteniendo métricas de gastos:", error);
        return { error: "Error al generar las métricas de ingresos y egresos." };
    }
}

export async function createExpense(data: {
    description: string;
    amount: number;
    category: ExpenseCategory;
    dueDate: Date;
}) {
    const session = await auth();
    if (!session?.user?.businessId) return { error: "No autorizado" };

    try {
        await db.fixedExpense.create({
            data: {
                description: data.description,
                amount: data.amount,
                category: data.category,
                dueDate: data.dueDate,
                businessId: session.user.businessId,
            }
        });
        revalidatePath("/dashboard", "layout");
        return { success: "Gasto fijo registrado con éxito." };
    } catch (error) {
        console.error("Error creando gasto:", error);
        return { error: "Error al registrar el gasto. Intente nuevamente." };
    }
}

export async function toggleExpensePaidStatus(expenseId: string, isPaid: boolean) {
    const session = await auth();
    if (!session?.user?.businessId) return { error: "No autorizado" };

    try {
        await db.fixedExpense.update({
            where: {
                id: expenseId,
                // Si no es ADMIN, asegura que solo pueda modificar los suyos
                ...(session.user.role !== "ADMIN" && { businessId: session.user.businessId })
            },
            data: {
                isPaid,
                paidAt: isPaid ? new Date() : null
            }
        });
        revalidatePath("/dashboard", "layout");
        return { success: `Gasto marcado como ${isPaid ? "pagado" : "pendiente"}.` };
    } catch (error) {
        console.error("Error actualizando gasto:", error);
        return { error: "Error al actualizar el estado del gasto." };
    }
}

export async function deleteExpense(expenseId: string) {
    const session = await auth();
    if (!session?.user?.businessId) return { error: "No autorizado" };

    try {
        await db.fixedExpense.update({
            where: {
                id: expenseId,
                ...(session.user.role !== "ADMIN" && { businessId: session.user.businessId })
            },
            data: {
                isDeleted: true
            }
        });
        revalidatePath("/dashboard", "layout");
        return { success: "Gasto eliminado correctamente." };
    } catch (error) {
        console.error("Error eliminando gasto:", error);
        return { error: "Error al eliminar el gasto." };
    }
}
