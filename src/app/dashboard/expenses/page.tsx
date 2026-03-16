import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getExpenseMetrics } from "@/actions/expenses";
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
    const res = await getExpenseMetrics("month", initialDate);

    if (res.error) {
        return (
            <div className="flex-1 p-8">
                <div className="p-4 bg-red-100 text-red-600 rounded-md">
                    {res.error}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 bg-zinc-50 min-h-[calc(100vh-4rem)]">
            <div className="max-w-6xl mx-auto">
                <ExpensesClient initialMetrics={res as any} />
            </div>
        </div>
    );
}
