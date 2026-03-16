"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { createExpense } from "@/actions/expenses";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ExpenseCategory } from "@prisma/client";

export function AddExpenseModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState<ExpenseCategory>("OTROS");
    const [dueDate, setDueDate] = useState("");

    useEffect(() => {
        // Set the initial date to today ONLY on the client to avoid hydration mismatch
        setDueDate(new Date().toISOString().split("T")[0]);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await createExpense({
            description,
            amount: Number(amount),
            category,
            dueDate: new Date(dueDate),
        });

        if (res?.error) {
            toast.error(res.error);
        } else {
            toast.success("Gasto fijo registrado.");
            setOpen(false);
            setDescription("");
            setAmount("");
            router.refresh();
        }

        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" /> Agregar Gasto Fijo
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registrar Gasto Fijo</DialogTitle>
                    <DialogDescription>Añade un nuevo gasto programado para este mes u otro.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Input
                            placeholder="Alquiler Marzo"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Monto ($)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="50000"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                                <SelectTrigger className="cursor-pointer">
                                    <SelectValue placeholder="Seleccione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(ExpenseCategory).map((catStr) => {
                                        const cat = catStr as string;
                                        return (
                                            <SelectItem key={cat} value={cat}>
                                                {cat.charAt(0) + cat.slice(1).toLowerCase()}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Fecha de Vencimiento / Pago esperado</Label>
                        <Input
                            type="date"
                            required
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer">
                        {loading ? "Guardando..." : "Guardar Gasto Fijo"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
