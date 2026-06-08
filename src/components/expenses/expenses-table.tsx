"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toggleExpensePaidStatus, deleteExpense } from "@/actions/expenses";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, TrendingUp, Droplets, Flame, Wifi, Home, Briefcase, Landmark, Box } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface ExpensesTableProps {
    expenses: any[];
}

export function ExpensesTable({ expenses }: ExpensesTableProps) {
    const router = useRouter();
    const [optimisticToggles, setOptimisticToggles] = useState<Record<string, boolean>>({});

    // Limpiar toggles optimistas al recibir nuevos gastos del servidor
    useEffect(() => {
        setOptimisticToggles({});
    }, [expenses]);

    const handleToggle = async (id: string, currentlyPaid: boolean) => {
        const nextState = !currentlyPaid;
        // Animación instantánea (Optimistic UI)
        setOptimisticToggles(prev => ({ ...prev, [id]: nextState }));

        const res = await toggleExpensePaidStatus(id, nextState);
        if (res?.error) {
            toast.error(res.error);
            // Revertir en caso de error
            setOptimisticToggles(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
        } else {
            toast.success(res.success);
            router.refresh(); // Next.js actualizará en background
        }
    };

    const handleDelete = async (id: string) => {
        const res = await deleteExpense(id);
        if (res?.error) {
            toast.error(res.error);
        } else {
            toast.success(res.success);
            router.refresh();
        }
    };

    const getCategoryIcon = (cat: string) => {
        const c = cat?.toUpperCase();
        switch (c) {
            case "LUZ": return <TrendingUp className="w-4 h-4 text-warning" />;
            case "GAS": return <Flame className="w-4 h-4 text-warning" />;
            case "AGUA": return <Droplets className="w-4 h-4 text-primary" />;
            case "INTERNET": return <Wifi className="w-4 h-4 text-primary" />;
            case "ALQUILER": return <Home className="w-4 h-4 text-success" />;
            case "SUELDOS": return <Briefcase className="w-4 h-4 text-muted-foreground" />;
            case "IMPUESTOS": return <Landmark className="w-4 h-4 text-danger-soft-foreground" />;
            default: return <Box className="w-4 h-4 text-muted-foreground" />;
        }
    };

    if (!expenses.length) {
        return <div className="p-8 text-center text-muted-foreground">No hay gastos fijos registrados.</div>;
    }

    return (
        <div className="rounded-md border bg-background overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Categoría / Descripción</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Estado Pago</TableHead>
                        <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expenses.map((e) => {
                        const isPaid = optimisticToggles[e.id] !== undefined ? optimisticToggles[e.id] : e.isPaid;

                        return (
                            <TableRow key={e.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-surface-subtle">
                                            {getCategoryIcon(e.categoryName)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">{e.description}</div>
                                            <div className="text-xs text-muted-foreground">{e.categoryName}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium text-foreground">
                                    ${Number(e.amount).toLocaleString("es-AR")}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {format(new Date(e.dueDate), "dd MMM, yyyy", { locale: es })}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={isPaid}
                                            onCheckedChange={() => handleToggle(e.id, isPaid)}
                                            className="cursor-pointer"
                                        />
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isPaid ? 'bg-success/15 text-success' : 'bg-danger-soft text-danger-soft-foreground'}`}>
                                            {isPaid ? 'Pagado' : 'Pendiente'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <ConfirmDialog
                                        title="¿Eliminar gasto?"
                                        description="Esta acción moverá el registro a estado eliminado y no podrá recuperarse."
                                        confirmLabel="Eliminar"
                                        variant="destructive"
                                        trigger={
                                            <Button variant="ghost" size="sm" className="cursor-pointer">
                                                <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-danger-soft-foreground transition-colors" />
                                            </Button>
                                        }
                                        onConfirm={async () => {
                                            await handleDelete(e.id);
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

