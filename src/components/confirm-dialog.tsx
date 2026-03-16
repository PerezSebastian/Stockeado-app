"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
    /** Título de la ventana de confirmación */
    title?: string;
    /** Descripción / mensaje de advertencia */
    description?: string;
    /** Texto del botón de confirmar */
    confirmLabel?: string;
    /** Texto del botón de cancelar */
    cancelLabel?: string;
    /** Variante visual del botón de confirmación */
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    /** Elemento que dispara el diálogo (botón, ícono, etc.) */
    trigger: React.ReactNode;
    /** Función async que se ejecuta al confirmar. Si lanza error, el dialog queda abierto. */
    onConfirm: () => Promise<void>;
}

/**
 * Diálogo de confirmación genérico y reutilizable.
 * Reemplaza el `confirm()` nativo del navegador con una ventana personalizada.
 *
 * @example
 * <ConfirmDialog
 *   title="Eliminar producto"
 *   description="Esta acción no se puede deshacer."
 *   confirmLabel="Eliminar"
 *   variant="destructive"
 *   trigger={<Button variant="ghost">Eliminar</Button>}
 *   onConfirm={async () => { await deleteProduct(id); }}
 * />
 */
export function ConfirmDialog({
    title = "¿Estás seguro?",
    description = "Esta acción no podrá deshacerse.",
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    variant = "destructive",
    trigger,
    onConfirm,
}: ConfirmDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Clonar el trigger para inyectarle el onClick */}
            <span onClick={() => setOpen(true)} className="contents">
                {trigger}
            </span>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        {description && (
                            <DialogDescription>{description}</DialogDescription>
                        )}
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            {cancelLabel}
                        </Button>
                        <Button
                            variant={variant}
                            onClick={handleConfirm}
                            disabled={loading}
                        >
                            {loading ? "Procesando..." : confirmLabel}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
