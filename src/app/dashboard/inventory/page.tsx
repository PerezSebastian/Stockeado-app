import { Button } from "@/components/ui/button";
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

export default async function InventoryPage() {
    const { products, error } = await getProducts();

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
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        type="search"
                        placeholder="Buscar por Nombre, SKU..."
                        className="pl-8 bg-white border-zinc-200"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/50">
                            <TableHead className="w-[100px]">SKU</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                            <TableHead className="text-right">Precio</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right">Estado</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!products || products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-zinc-500">
                                    No hay productos en el inventario.
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.map((p) => (
                                <TableRow key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <TableCell className="font-medium text-zinc-500 text-xs uppercase tracking-wider">
                                        {p.sku || "N/A"}
                                    </TableCell>
                                    <TableCell className="font-semibold text-zinc-900">{p.name}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-zinc-500">{p.category || "General"}</TableCell>
                                    <TableCell className="text-right font-medium text-zinc-900">
                                        ${Number(p.price).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{p.stock}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end">
                                            {p.stock <= p.minStock ? (
                                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 font-medium">
                                                    Bajo Stock
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 font-medium">
                                                    Óptimo
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <ProductActions id={p.id} name={p.name} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
