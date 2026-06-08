import { getStockMovements } from "@/actions/movements";
import { MovementsSearch } from "@/components/movements-search";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaginationControl } from "@/components/ui/pagination-control";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function MovementsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; limit?: string }>;
}) {
    const resolvedParams = await searchParams;
    const query = resolvedParams?.q || "";
    const page = Number(resolvedParams?.page) || 1;
    const limit = Number(resolvedParams?.limit) || 10;

    const { movements, totalCount, totalPages, error } = await getStockMovements(query, page, limit);

    if (error) {
        return (
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed border-border bg-background">
                <p className="text-muted-foreground">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Movimientos de Stock</h1>
                    <p className="text-muted-foreground">Historial completo de entradas y salidas de stock.</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <MovementsSearch />
            </div>

            {/* Unified Card Container */}
            <div className="bg-background border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                <div className="w-full">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-surface-subtle/50">
                                <TableHead className="text-center">Fecha y Hora</TableHead>
                                <TableHead className="text-center">SKU</TableHead>
                                <TableHead className="text-left">Producto</TableHead>
                                <TableHead className="text-center">Tipo</TableHead>
                                <TableHead className="text-center">Cantidad</TableHead>
                                <TableHead className="text-left">Motivo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!movements || movements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No se encontraron movimientos de stock.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                movements.map((m) => (
                                    <TableRow key={m.id} className="hover:bg-surface-subtle/50 transition-colors border-border">
                                        <TableCell className="text-center text-muted-foreground text-sm">
                                            {format(new Date(m.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                        </TableCell>
                                        <TableCell className="text-center font-medium text-muted-foreground text-xs uppercase tracking-wider">
                                            {m.product.sku || "N/A"}
                                        </TableCell>
                                        <TableCell className="text-left font-semibold text-foreground">
                                            {m.product.name}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {m.type === "IN" ? (
                                                <Badge className="bg-success/15 text-success hover:bg-success/15 border border-success/20 font-medium">
                                                    Entrada
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="bg-danger-soft text-danger-soft-foreground hover:bg-danger-soft border-danger-soft-foreground/20 font-medium">
                                                    Salida
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className={`text-center font-mono font-bold ${m.type === "IN" ? "text-success" : "text-danger-soft-foreground"
                                            }`}>
                                            {m.type === "IN" ? "+" : "-"}{m.quantity}
                                        </TableCell>
                                        <TableCell className="text-left text-muted-foreground text-sm">
                                            {m.reason || "Sin especificar"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination footer */}
                {movements && movements.length > 0 && (
                    <div className="border-t border-border bg-surface-subtle/10">
                        <PaginationControl
                            currentPage={page}
                            limit={limit}
                            totalPages={totalPages || 1}
                            totalItems={totalCount || 0}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

