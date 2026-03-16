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
            <div className="flex h-[400px] items-center justify-center rounded-md border border-dashed border-zinc-200 bg-white">
                <p className="text-zinc-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Movimientos de Stock</h1>
                    <p className="text-zinc-500">Historial completo de entradas y salidas de stock.</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <MovementsSearch />
            </div>

            {/* Unified Card Container */}
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
                <div className="w-full">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-zinc-50/50">
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
                                    <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                                        No se encontraron movimientos de stock.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                movements.map((m) => (
                                    <TableRow key={m.id} className="hover:bg-zinc-50/50 transition-colors border-zinc-100">
                                        <TableCell className="text-center text-zinc-500 text-sm">
                                            {format(new Date(m.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                                        </TableCell>
                                        <TableCell className="text-center font-medium text-zinc-500 text-xs uppercase tracking-wider">
                                            {m.product.sku || "N/A"}
                                        </TableCell>
                                        <TableCell className="text-left font-semibold text-zinc-900">
                                            {m.product.name}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {m.type === "IN" ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 font-medium">
                                                    Entrada
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200 font-medium">
                                                    Salida
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className={`text-center font-mono font-bold ${m.type === "IN" ? "text-emerald-600" : "text-rose-600"
                                            }`}>
                                            {m.type === "IN" ? "+" : "-"}{m.quantity}
                                        </TableCell>
                                        <TableCell className="text-left text-zinc-600 text-sm">
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
                    <div className="border-t border-zinc-100 bg-zinc-50/10">
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
