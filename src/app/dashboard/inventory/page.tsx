import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { getProducts } from "@/actions/inventory";
import { CreateProductSheet } from "@/components/create-product-sheet";
import { ProductActions } from "@/components/product-actions";
import { InventorySearch } from "@/components/inventory-search";
import { QuickStockAdjust } from "@/components/quick-stock-adjust";
import { PaginationControl } from "@/components/ui/pagination-control";

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; limit?: string }>;
}) {
    const resolvedParams = await searchParams;
    const query = resolvedParams?.q || "";
    const page = Number(resolvedParams?.page) || 1;
    const limit = Number(resolvedParams?.limit) || 10;

    const { products, totalCount, totalPages, error } = await getProducts(query, page, limit);

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
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Inventario</h1>
                    <p className="text-zinc-500">Administra tus productos, precios y niveles de stock.</p>
                </div>
                <CreateProductSheet />
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <InventorySearch />
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-zinc-50/50 border-b border-zinc-200">
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden md:table-cell">SKU</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nombre</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Categoría</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Precio</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Stock</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Disponibilidad</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nivel</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Estado</TableHead>
                                <TableHead className="px-3 py-4 w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!products || products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-zinc-400 gap-2">
                                            <Search className="h-10 w-10 opacity-20" />
                                            <p className="font-medium">No hay productos en el inventario.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((p) => (
                                    <TableRow
                                        key={p.id}
                                        className={`transition-colors group ${p.isDeleted
                                            ? "bg-zinc-50/80 opacity-60 hover:opacity-80"
                                            : "hover:bg-zinc-50/50"
                                            }`}
                                    >
                                        <TableCell className="px-3 py-3 text-center font-medium text-zinc-500 text-[10px] uppercase tracking-wider hidden md:table-cell">
                                            {p.sku || "N/A"}
                                        </TableCell>
                                        <TableCell className={`px-3 py-3 text-center font-bold text-sm ${p.isDeleted ? "line-through text-zinc-400" : "text-zinc-900"}`}>
                                            {p.name}
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-center hidden sm:table-cell text-zinc-500 font-medium text-xs">
                                            {p.category || "General"}
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-center font-bold text-zinc-900 text-sm">
                                            ${Number(p.price).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-center">
                                            <QuickStockAdjust
                                                productId={p.id}
                                                currentStock={p.stock}
                                                disabled={p.isDeleted}
                                            />
                                        </TableCell>

                                        {/* Disponibilidad: basada en stock */}
                                        <TableCell className="px-3 py-3 text-center hidden lg:table-cell">
                                            {p.stock > 0 ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Disponible
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Sin Stock
                                                </Badge>
                                            )}
                                        </TableCell>

                                        {/* Nivel de stock */}
                                        <TableCell className="px-3 py-3 text-center">
                                            {p.stock <= p.minStock ? (
                                                <Badge variant="destructive" className="bg-red-50 text-red-700 hover:bg-red-100 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Bajo
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Óptimo
                                                </Badge>
                                            )}
                                        </TableCell>

                                        {/* Estado: Habilitado / Dado de baja */}
                                        <TableCell className="px-3 py-3 text-center hidden md:table-cell">
                                            {p.isDeleted ? (
                                                <Badge className="bg-zinc-100 text-zinc-500 hover:bg-zinc-200 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Inactivo
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-violet-50 text-violet-700 hover:bg-violet-100 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Activo
                                                </Badge>
                                            )}
                                        </TableCell>

                                        <TableCell className="px-3 py-3">
                                            <ProductActions product={p} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="border-t border-zinc-100 bg-zinc-50/30">
                    <PaginationControl
                        currentPage={page}
                        limit={limit}
                        totalPages={totalPages || 1}
                        totalItems={totalCount || 0}
                    />
                </div>
            </div>
        </div>
    );
}
