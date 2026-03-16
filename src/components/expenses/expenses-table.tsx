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
        switch (cat) {
            case "LUZ": return <TrendingUp className="w-4 h-4 text-yellow-500" />;
            case "GAS": return <Flame className="w-4 h-4 text-orange-500" />;
            case "AGUA": return <Droplets className="w-4 h-4 text-blue-500" />;
            case "INTERNET": return <Wifi className="w-4 h-4 text-indigo-500" />;
            case "ALQUILER": return <Home className="w-4 h-4 text-emerald-600" />;
            case "SUELDOS": return <Briefcase className="w-4 h-4 text-zinc-600" />;
            case "IMPUESTOS": return <Landmark className="w-4 h-4 text-rose-500" />;
            default: return <Box className="w-4 h-4 text-zinc-400" />;
        }
    };

    if (!expenses.length) {
        return <div className="p-8 text-center text-zinc-500">No hay gastos fijos registrados.</div>;
    }

    return (
        <div className="rounded-md border bg-white overflow-x-auto">
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
                                        <div className="p-2 rounded-md bg-zinc-50">
                                            {getCategoryIcon(e.category)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-zinc-900">{e.description}</div>
                                            <div className="text-xs text-zinc-500">{e.category}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium text-zinc-700">
                                    ${Number(e.amount).toLocaleString("es-AR")}
                                </TableCell>
                                <TableCell className="text-zinc-600">
                                    {format(new Date(e.dueDate), "dd MMM, yyyy", { locale: es })}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={isPaid}
                                            onCheckedChange={() => handleToggle(e.id, isPaid)}
                                            className="cursor-pointer"
                                        />
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
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
                                                <Trash2 className="w-4 h-4 text-zinc-400 group-hover:text-rose-600 transition-colors" />
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
