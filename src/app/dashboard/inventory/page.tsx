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
import { getCategories } from "@/actions/categories";
import { CreateProductSheet } from "@/components/create-product-sheet";
import { ProductActions } from "@/components/product-actions";
import { InventorySearch } from "@/components/inventory-search";
import { CategoryFilter } from "@/components/category-filter";
import { QuickStockAdjust } from "@/components/quick-stock-adjust";
import { PaginationControl } from "@/components/ui/pagination-control";

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; limit?: string; category?: string }>;
}) {
    const resolvedParams = await searchParams;
    const query = resolvedParams?.q || "";
    const page = Number(resolvedParams?.page) || 1;
    const limit = Number(resolvedParams?.limit) || 10;
    const category = resolvedParams?.category || "all";

    const [productsData, categoriesData] = await Promise.all([
        getProducts(query, page, limit, category),
        getCategories('PRODUCT')
    ]);

    const { products, totalCount, totalPages, error } = productsData;
    const categories = "categories" in categoriesData ? categoriesData.categories : [];

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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventario</h1>
                    <p className="text-muted-foreground">Administra tus productos, precios y niveles de stock.</p>
                </div>
                <CreateProductSheet categories={categories || []} />
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start w-full">
                <div className="w-full sm:max-w-sm">
                    <InventorySearch />
                </div>
                <CategoryFilter categories={categories || []} />
            </div>

            {/* Table Container */}
            <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-surface-subtle/50 border-b border-border">
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">SKU</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nombre</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Categoría</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Precio</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stock</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Disponibilidad</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nivel</TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Estado</TableHead>
                                <TableHead className="px-3 py-4 w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!products || products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
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
                                            ? "bg-surface-subtle/80 opacity-60 hover:opacity-80"
                                            : "hover:bg-surface-subtle/50"
                                            }`}
                                    >
                                        <TableCell className="px-3 py-3 text-center font-medium text-muted-foreground text-[10px] uppercase tracking-wider hidden md:table-cell">
                                            {p.sku || "N/A"}
                                        </TableCell>
                                        <TableCell className={`px-3 py-3 text-center font-bold text-sm ${p.isDeleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                            {p.name}
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-center hidden sm:table-cell text-muted-foreground font-medium text-xs">
                                            {(p as any).categoryRel?.name ?? p.category ?? "Sin categoría"}
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-center font-bold text-foreground text-sm">
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
                                                <Badge className="bg-success/15 text-success hover:bg-success/15 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Disponible
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-warning/15 text-warning hover:bg-warning/15 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Sin Stock
                                                </Badge>
                                            )}
                                        </TableCell>

                                        {/* Nivel de stock */}
                                        <TableCell className="px-3 py-3 text-center">
                                            {p.stock <= p.minStock ? (
                                                <Badge variant="destructive" className="bg-danger-soft text-danger-soft-foreground hover:bg-danger-soft border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Bajo
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-primary/15 text-primary hover:bg-primary/15 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Óptimo
                                                </Badge>
                                            )}
                                        </TableCell>

                                        {/* Estado: Habilitado / Dado de baja */}
                                        <TableCell className="px-3 py-3 text-center hidden md:table-cell">
                                            {p.isDeleted ? (
                                                <Badge className="bg-surface-subtle text-muted-foreground hover:bg-surface-subtle border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Inactivo
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Activo
                                                </Badge>
                                            )}
                                        </TableCell>

                                        <TableCell className="px-3 py-3">
                                            <ProductActions product={p} categories={categories || []} />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="border-t border-border bg-surface-subtle/30">
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

