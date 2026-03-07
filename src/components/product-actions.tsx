"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteProduct } from "@/actions/inventory";
import { toast } from "sonner";
import { useState } from "react";

interface ProductActionsProps {
    id: string;
    name: string;
}

export function ProductActions({ id, name }: ProductActionsProps) {
    const [loading, setLoading] = useState(false);

    const onDelete = async () => {
        if (!confirm(`¿Estás seguro de que deseas eliminar "${name}"? Esta acción no se puede deshacer.`)) return;

        setLoading(true);
        try {
            const res = await deleteProduct(id);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(res.success);
            }
        } catch (error) {
            toast.error("Error al intentar eliminar el producto");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" disabled={loading}>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    onClick={onDelete}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
