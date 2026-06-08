"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PaginationControl } from "@/components/ui/pagination-control";
import { CatalogSearch } from "./catalog-search";
import { CategoryFilter } from "@/components/category-filter";
import { EditCatalogProductSheet } from "./edit-catalog-product-sheet";
import { ViewCatalogProductSheet } from "./view-catalog-product-sheet";
import { toggleCatalogProductVisibility } from "@/actions/catalog";
 
interface CatalogProduct {
    id: string;
    productId: string;
    isPublic: boolean;
    isDeleted: boolean;
    productName: string;
    productSku: string | null;
    productPrice: number;
    categoryName: string;
    values: Array<{
        attributeId: string;
        value: string | null;
        optionId: string | null;
    }>;
}

interface Attribute {
    id: string;
    name: string;
    type: "TEXT" | "NUMBER" | "BOOLEAN" | "CHOICE" | "IMAGE";
    isList: boolean;
    options: Array<{ id: string; value: string }>;
}

interface CatalogProductsTabProps {
    initialCatalogs: CatalogProduct[];
    attributes: Attribute[];
    categories: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
}

export function CatalogProductsTab({
    initialCatalogs,
    attributes,
    categories,
    totalCount,
    totalPages,
    currentPage,
    limit,
}: CatalogProductsTabProps) {
    const [catalogs, setCatalogs] = useState<CatalogProduct[]>(initialCatalogs);
    const [viewOpen, setViewOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<{
        name: string;
        values: any[];
    } | null>(null);

    // Sincronizar estado local si cambian los props del servidor
    useEffect(() => {
        setCatalogs(initialCatalogs);
    }, [initialCatalogs]);

    const handleToggleVisibility = async (catalogId: string, currentPublic: boolean) => {
        const nextValue = !currentPublic;
        
        // Optimista: Actualizar UI local inmediatamente
        setCatalogs(prev =>
            prev.map(c => (c.id === catalogId ? { ...c, isPublic: nextValue } : c))
        );

        try {
            const res = await toggleCatalogProductVisibility(catalogId, nextValue);
            if (res.error) {
                toast.error(res.error);
                // Revertir en caso de error
                setCatalogs(prev =>
                    prev.map(c => (c.id === catalogId ? { ...c, isPublic: currentPublic } : c))
                );
            } else {
                toast.success(res.success);
            }
        } catch {
            toast.error("Error al actualizar la visibilidad");
            // Revertir
            setCatalogs(prev =>
                prev.map(c => (c.id === catalogId ? { ...c, isPublic: currentPublic } : c))
            );
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start w-full">
                <div className="w-full sm:max-w-sm">
                    <CatalogSearch />
                </div>
                <CategoryFilter categories={categories || []} />
            </div>

            {/* Table Container */}
            <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-surface-subtle/50 border-b border-border">
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                                    SKU
                                </TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Nombre
                                </TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                                    Categoría
                                </TableHead>

                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Visibilidad Web
                                </TableHead>
                                <TableHead className="px-3 py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Estado Inventario
                                </TableHead>
                                <TableHead className="px-3 py-4 w-[120px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {catalogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                            <Search className="h-10 w-10 opacity-20" />
                                            <p className="font-medium">No se encontraron productos en el catálogo.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                catalogs.map((c) => (
                                    <TableRow
                                        key={c.id}
                                        className={`transition-colors cursor-pointer select-none ${
                                            c.isDeleted
                                                ? "bg-surface-subtle/80 opacity-60 hover:opacity-85"
                                                : "hover:bg-surface-subtle/50"
                                        }`}
                                        onClick={() => {
                                            setSelectedProduct({
                                                name: c.productName,
                                                values: c.values,
                                            });
                                            setViewOpen(true);
                                        }}
                                        onDoubleClick={() => {
                                            setSelectedProduct({
                                                name: c.productName,
                                                values: c.values,
                                            });
                                            setViewOpen(true);
                                        }}
                                    >
                                        {/* SKU */}
                                        <TableCell className="px-3 py-3 text-center font-medium text-muted-foreground text-[10px] uppercase tracking-wider hidden md:table-cell">
                                            {c.productSku || "N/A"}
                                        </TableCell>

                                        {/* Nombre */}
                                        <TableCell className={`px-3 py-3 text-center font-bold text-sm ${c.isDeleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                            {c.productName}
                                        </TableCell>

                                        {/* Categoría */}
                                        <TableCell className="px-3 py-3 text-center hidden sm:table-cell text-muted-foreground font-medium text-xs">
                                            {c.categoryName}
                                        </TableCell>

                                        {/* Visibilidad Web (Switch) */}
                                        <TableCell className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-2">
                                                <Switch
                                                    checked={c.isPublic}
                                                    disabled={c.isDeleted}
                                                    onCheckedChange={() => handleToggleVisibility(c.id, c.isPublic)}
                                                    className="cursor-pointer"
                                                />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden lg:inline-block w-14 text-left">
                                                    {c.isPublic ? "Visible" : "Oculto"}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Estado Inventario */}
                                        <TableCell className="px-3 py-3 text-center">
                                            {c.isDeleted ? (
                                                <Badge className="bg-danger-soft text-danger-soft-foreground border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Baja Lógica
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-success/15 text-success border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                    Habilitado
                                                </Badge>
                                            )}
                                        </TableCell>

                                        {/* Acciones */}
                                        <TableCell className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            <EditCatalogProductSheet
                                                productCatalogId={c.id}
                                                productName={c.productName}
                                                attributes={attributes}
                                                currentValues={c.values}
                                                onSaveSuccess={() => {
                                                    // Opcional: Podríamos revalidar el server component,
                                                    // next.js revalidatePath ya lo hace de fondo, así que el refresh de URL ocurrirá de fondo
                                                    // Pero para asegurarnos, forzamos router.refresh
                                                    window.location.reload();
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                {/* Paginación */}
                <div className="border-t border-border bg-surface-subtle/30">
                    <PaginationControl
                        currentPage={currentPage}
                        limit={limit}
                        totalPages={totalPages || 1}
                        totalItems={totalCount || 0}
                    />
                </div>
            </div>

            {/* Modal de Solo Vista Controlado */}
            {selectedProduct && (
                <ViewCatalogProductSheet
                    open={viewOpen}
                    onOpenChange={setViewOpen}
                    productName={selectedProduct.name}
                    attributes={attributes}
                    currentValues={selectedProduct.values}
                />
            )}
        </div>
    );
}
