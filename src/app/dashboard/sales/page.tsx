import { getSales } from "@/actions/sales";
import { SalesSearch } from "@/components/sales-search";
import { SalesTable } from "@/components/sales-table";
import { PaginationControl } from "@/components/ui/pagination-control";
import type { SerializedSale } from "@/types/sales";

export default async function SalesPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; limit?: string }>;
}) {
    const resolvedParams = await searchParams;
    const query = resolvedParams?.q || "";
    const page = Number(resolvedParams?.page) || 1;
    const limit = Number(resolvedParams?.limit) || 10;

    const result = await getSales(query, page, limit);

    if ("error" in result) {
        return (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed border-border bg-background">
                <p className="text-muted-foreground">{result.error}</p>
            </div>
        );
    }

    const sales: SerializedSale[] = result.sales;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Historial de Ventas</h1>
                    <p className="text-muted-foreground">Un registro de todas las ventas procesadas y sus detalles.</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <SalesSearch />
            </div>

            {/* Unified Sales Card Container */}
            <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                <SalesTable sales={sales} />
                <div className="border-t border-border bg-surface-subtle/10">
                    <PaginationControl
                        currentPage={page}
                        limit={limit}
                        totalPages={result.totalPages}
                        totalItems={result.totalCount}
                    />
                </div>
            </div>
        </div>
    );
}


