"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, RotateCcw } from "lucide-react";
import { deleteProduct, restoreProduct } from "@/actions/inventory";
import { toast } from "sonner";
import { useState } from "react";
import { EditProductSheet } from "@/components/edit-product-sheet";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Category } from "@prisma/client";

interface Product {
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    categoryId?: string | null;
    cost: number;
    price: number;
    stock: number;
    minStock: number;
    isDeleted: boolean;
}

interface ProductActionsProps {
    product: Product;
    categories: Category[];
}

export function ProductActions({ product, categories }: ProductActionsProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleDelete = async () => {
        const res = await deleteProduct(product.id);
        if (res.error) toast.error(res.error);
        else toast.success(res.success);
    };

    const handleRestore = async () => {
        const res = await restoreProduct(product.id);
        if (res.error) toast.error(res.error);
        else toast.success(res.success);
    };

    return (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[170px]">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {!product.isDeleted && (
                    <EditProductSheet product={product} categories={categories} onClose={() => setMenuOpen(false)} />
                )}

                {product.isDeleted ? (
                    <ConfirmDialog
                        title="¿Habilitar producto?"
                        description={`"${product.name}" volverá a estar activo en el inventario.`}
                        confirmLabel="Habilitar"
                        variant="default"
                        trigger={
                            <DropdownMenuItem
                                className="cursor-pointer text-success focus:text-success"
                                onSelect={(e) => e.preventDefault()}
                            >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Habilitar
                            </DropdownMenuItem>
                        }
                        onConfirm={handleRestore}
                    />
                ) : (
                    <ConfirmDialog
                        title="¿Dar de baja el producto?"
                        description={`"${product.name}" quedará deshabilitado. Podrás reactivarlo en cualquier momento desde la tabla.`}
                        confirmLabel="Dar de baja"
                        variant="destructive"
                        trigger={
                            <DropdownMenuItem
                                className="cursor-pointer text-danger-soft-foreground focus:text-danger-soft-foreground"
                                onSelect={(e) => e.preventDefault()}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Dar de baja
                            </DropdownMenuItem>
                        }
                        onConfirm={handleDelete}
                    />
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

