"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, PackageOpen } from "lucide-react";
import { adjustStock } from "@/actions/inventory";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface QuickStockAdjustProps {
    productId: string;
    currentStock: number;
    disabled?: boolean;
}

export function QuickStockAdjust({ productId, currentStock, disabled }: QuickStockAdjustProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newStock, setNewStock] = useState<number>(currentStock);
    const [reason, setReason] = useState("Sin motivo");

    // Sincronizar estado si vuelve a abrir (o cambia la prop)
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setNewStock(currentStock);
            setReason("Sin motivo");
        }
        setOpen(isOpen);
    };

    const handleSave = async () => {
        if (newStock < 0 || isNaN(newStock)) {
            toast.error("La cantidad de stock no puede ser negativa");
            return;
        }

        // Si no hay variación, solo cerramos
        if (newStock === currentStock) {
            setOpen(false);
            return;
        }

        setLoading(true);
        try {
            const res = await adjustStock(productId, newStock, reason);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(res.success);
                setOpen(false);
            }
        } catch (e) {
            toast.error("Ocurrió un error al ajustar el stock");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <div className="flex items-center justify-center gap-2">
                <span className="w-8 text-center font-medium mr-1">{currentStock}</span>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        title="Modificar Stock"
                        disabled={disabled}
                    >
                        <PackageOpen className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
            </div>

            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Ajustar Stock</DialogTitle>
                    <DialogDescription>
                        Cambiá la cantidad absoluta de unidades disponibles.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="currentStock" className="text-right text-muted-foreground">
                            Actual
                        </Label>
                        <span className="col-span-3 font-medium">{currentStock}</span>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="newStock" className="text-right">
                            Nuevo Stock
                        </Label>
                        <Input
                            id="newStock"
                            type="number"
                            min="0"
                            className="col-span-3 font-medium"
                            value={newStock}
                            onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reason" className="text-right">
                            Motivo
                        </Label>
                        <Input
                            id="reason"
                            type="text"
                            placeholder="Ej: Productos vencidos"
                            className="col-span-3"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="cursor-pointer">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

