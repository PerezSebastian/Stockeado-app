import { Suspense } from "react";
import { getAnalyticsData, AnalyticsPeriod } from "@/actions/analytics";
import { AnalyticsDashboardClient } from "@/components/analytics-dashboard-client";

export default async function AnalyticsPage({
    searchParams,
}: {
    searchParams: Promise<{ p?: string }>;
}) {
    const resolvedParams = await searchParams;
    const period = (resolvedParams?.p as AnalyticsPeriod) || "TODAY";

    // Server fetch
    const data = await getAnalyticsData(period);

    if (data.error || !data.data) {
        return (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed border-border bg-background">
                <p className="text-muted-foreground">{data.error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black tracking-tighter text-foreground">Estadísticas</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Analítica avanzada, productos más vendidos y rendimientos.
                </p>
            </div>

            <Suspense fallback={
                <div className="h-[600px] w-full flex items-center justify-center border rounded-xl bg-surface-subtle animate-pulse text-muted-foreground font-medium">
                    Cargando gráficos de {period}...
                </div>
            }>
                <AnalyticsDashboardClient initialData={data.data} currentPeriod={period} />
            </Suspense>
        </div>
    );
}

