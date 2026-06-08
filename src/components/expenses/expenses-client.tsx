"use client";

import { useState, useMemo, useEffect } from "react";
import { format, addMonths, subMonths, addYears, subYears } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { ExpensesSummary } from "./expenses-summary";
import { ExpensesTable } from "./expenses-table";
import { ExpensesCharts } from "./expenses-charts";
import { AddExpenseModal } from "./add-expense-modal";
import { PaginationControl } from "@/components/ui/pagination-control";
import { getPaginatedExpenses, getExpenseMetrics } from "@/actions/expenses";
import { Category } from "@prisma/client";

interface ExpensesClientProps {
    initialMetrics: {
        summary: { totalGastos: number; totalPagado: number; totalPendiente: number; };
        unpaidExpenses: any[];
        chartData: any[];
        uniqueCategories: string[];
    };
    categories: Category[];
}

export function ExpensesClient({ initialMetrics, categories }: ExpensesClientProps) {
    const [filterType, setFilterType] = useState<"month" | "year" | "all">("month");
    const [referenceDate, setReferenceDate] = useState(new Date());
    const [metrics, setMetrics] = useState(initialMetrics);
    const [isMetricsLoading, setIsMetricsLoading] = useState(false);

    const searchParams = useSearchParams();
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;

    const [paginatedData, setPaginatedData] = useState<{
        expenses: any[];
        totalCount: number;
        totalPages: number;
        isLoading: boolean;
    }>({
        expenses: [],
        totalCount: 0,
        totalPages: 1,
        isLoading: true
    });

    // Fetch Metrics (Summary + Chart Data) when period changes or when metrics are revalidated
    useEffect(() => {
        let isMounted = true;
        setIsMetricsLoading(true);

        const fetchMetrics = async () => {
            const res = await getExpenseMetrics(filterType, referenceDate.toISOString());
            if (isMounted && !res.error) {
                setMetrics(res as any);
            }
            if (isMounted) setIsMetricsLoading(false);
        };

        // Si estamos viendo el mes actual, usamos los iniciales actualizados por revalidatePath
        // Si no, volvemos a fetchear los de la vista actual (ej: año o all)
        if (filterType === "month" && format(referenceDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')) {
            setMetrics(initialMetrics);
            setIsMetricsLoading(false);
        } else {
            fetchMetrics();
        }

        return () => { isMounted = false; };
    }, [filterType, referenceDate, initialMetrics]); // initialMetrics triggers when router.refresh happens

    useEffect(() => {
        let isMounted = true;
        setPaginatedData(prev => ({ ...prev, isLoading: true }));

        getPaginatedExpenses(page, limit, filterType, referenceDate.toISOString())
            .then((res: any) => {
                if (isMounted && !res.error) {
                    setPaginatedData({
                        expenses: res.expenses || [],
                        totalCount: res.totalCount || 0,
                        totalPages: res.totalPages || 1,
                        isLoading: false
                    });
                }
            })
            .catch((err: unknown) => {
                console.error("Failed to fetch paginated expenses", err);
                if (isMounted) setPaginatedData(prev => ({ ...prev, isLoading: false }));
            });

        return () => { isMounted = false; };
    }, [page, limit, filterType, referenceDate, initialMetrics]); // initialMetrics triggers pagination update too



    const handlePrevious = () => {
        if (filterType === "month") setReferenceDate(prev => subMonths(prev, 1));
        if (filterType === "year") setReferenceDate(prev => subYears(prev, 1));
    };

    const handleNext = () => {
        if (filterType === "month") setReferenceDate(prev => addMonths(prev, 1));
        if (filterType === "year") setReferenceDate(prev => addYears(prev, 1));
    };

    const getTitle = () => {
        if (filterType === "all") return "Historial de Gastos Fijos";
        if (filterType === "year") return `Gastos fijos de ${format(referenceDate, "yyyy")}`;
        const monthName = format(referenceDate, "MMMM", { locale: es });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        return `Gastos fijos de ${capitalizedMonth} ${format(referenceDate, "yyyy")}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">{getTitle()}</h2>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <Select value={filterType} onValueChange={(v: "month" | "year" | "all") => setFilterType(v)}>
                        <SelectTrigger className="w-[140px] bg-background cursor-pointer transition-colors hover:border-border">
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Periodo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="month">Mensual</SelectItem>
                            <SelectItem value="year">Anual</SelectItem>
                            <SelectItem value="all">Histórico</SelectItem>
                        </SelectContent>
                    </Select>

                    {filterType !== "all" && (
                        <div className="flex items-center bg-background border border-border rounded-md">
                            <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer hover:bg-surface-subtle" onClick={handlePrevious}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="px-2 text-sm font-medium text-foreground min-w-[70px] text-center capitalize">
                                {filterType === "month" ? format(referenceDate, "MMM yy", { locale: es }) : format(referenceDate, "yyyy")}
                            </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer hover:bg-surface-subtle" onClick={handleNext}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                    <AddExpenseModal categories={categories} />
                </div>
            </div>

            <ExpensesSummary summary={metrics.summary} />

            {metrics.unpaidExpenses.length > 0 && (
                <>
                    <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Gastos Pendientes</h3>
                    <ExpensesTable expenses={metrics.unpaidExpenses} />
                </>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 relative">
                {isMetricsLoading && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-md">
                        <div className="h-6 w-6 border-2 border-border border-t-zinc-600 rounded-full animate-spin" />
                    </div>
                )}
                <ExpensesCharts
                    chartData={metrics.chartData}
                    uniqueCategories={metrics.uniqueCategories}
                    filterType={filterType}
                />
            </div>

            <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Detalle de Gastos</h3>
            <div className="bg-background border rounded-md shadow-sm relative">
                {paginatedData.isLoading && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="h-6 w-6 border-2 border-border border-t-zinc-600 rounded-full animate-spin" />
                    </div>
                )}
                <ExpensesTable expenses={paginatedData.expenses} />
                <div className="border-t">
                    <PaginationControl
                        currentPage={page}
                        limit={limit}
                        totalPages={paginatedData.totalPages}
                        totalItems={paginatedData.totalCount}
                    />
                </div>
            </div>
        </div>
    );
}

