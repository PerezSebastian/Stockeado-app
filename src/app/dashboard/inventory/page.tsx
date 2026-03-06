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
import { Plus, Search, MoreHorizontal } from "lucide-react";

// Mock data
const products = [
    { id: "1", sku: "TSH-001", name: "Remera Básica Algodón", category: "Ropa", cost: 1200, price: 3500, stock: 45, minStock: 10 },
    { id: "2", sku: "PNT-002", name: "Pantalón Cargo Black", category: "Ropa", cost: 4500, price: 8900, stock: 8, minStock: 15 },
    { id: "3", sku: "ACC-001", name: "Gorra Trucker Logo", category: "Accesorios", cost: 800, price: 2500, stock: 110, minStock: 20 },
    { id: "4", sku: "SHO-004", name: "Zapatillas Urbanas", category: "Calzado", cost: 15000, price: 29000, stock: 12, minStock: 5 },
    { id: "5", sku: "TSH-005", name: "Remera Oversize", category: "Ropa", cost: 1500, price: 4200, stock: 2, minStock: 10 },
];

export default function InventoryPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Inventario</h1>
                    <p className="text-zinc-500">Administra tus productos, precios y niveles de stock.</p>
                </div>
                <Button className="shrink-0 bg-zinc-900 hover:bg-zinc-800 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir Producto
                </Button>
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
            <div className="rounded-md border border-zinc-200 bg-white">
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
                        {products.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium text-zinc-500 text-xs">{p.sku}</TableCell>
                                <TableCell className="font-medium">{p.name}</TableCell>
                                <TableCell className="hidden sm:table-cell text-zinc-500">{p.category}</TableCell>
                                <TableCell className="text-right font-medium">
                                    ${p.price.toLocaleString("es-AR")}
                                </TableCell>
                                <TableCell className="text-right">{p.stock}</TableCell>
                                <TableCell className="text-right items-end flex justify-end">
                                    {p.stock <= p.minStock ? (
                                        <Badge variant="destructive" className="bg-red-500">Bajo Stock</Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Óptimo</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
