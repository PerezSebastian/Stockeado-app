import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getExpenseMetrics } from "@/actions/expenses";
import { getCategories } from "@/actions/categories";
import { ExpensesClient } from "@/components/expenses/expenses-client";

export const metadata = {
    title: "Gastos Fijos",
};

export default async function ExpensesPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/auth/login");
    }

    // Server-Side Aggregation: Pasamos las métricas ligeras iniciales (Mes actual)
    const initialDate = new Date().toISOString();
    const [metricsRes, categoriesRes] = await Promise.all([
        getExpenseMetrics("month", initialDate),
        getCategories(),
    ]);

    if (metricsRes.error) {
        return (
            <div className="flex-1 p-8">
                <div className="p-4 bg-danger-soft text-danger-soft-foreground rounded-md">
                    {metricsRes.error}
                </div>
            </div>
        );
    }

    const categories = "categories" in categoriesRes ? categoriesRes.categories : [];

    return (
        <div className="flex-1 p-8 bg-surface-subtle min-h-[calc(100vh-4rem)]">
            <div className="max-w-6xl mx-auto">
                <ExpensesClient 
                    initialMetrics={metricsRes as any} 
                    categories={categories || []}
                />
            </div>
        </div>
    );
}

