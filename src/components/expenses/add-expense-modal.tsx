"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategorySearchSelect } from "@/components/category-search-select";
import { Plus } from "lucide-react";
import { createExpense } from "@/actions/expenses";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Category } from "@prisma/client";

const LEGACY_EXPENSE_CATEGORIES = [
    "LUZ",
    "GAS",
    "INTERNET",
    "ALQUILER",
    "AGUA",
    "SUELDOS",
    "IMPUESTOS",
    "OTROS",
];

interface AddExpenseModalProps {
    categories: Category[];
}

export function AddExpenseModal({ categories }: AddExpenseModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const defaultCategoryId = categories.find((category) => category.type === "EXPENSE")?.id ?? "";
    const expenseCategoryOptions = categories
        .filter((category) => category.type === "EXPENSE" && category.isActive !== false)
        .map((category) => ({
            label: category.name,
            value: category.id,
        }));
    const categoryOptions = expenseCategoryOptions.length > 0
        ? expenseCategoryOptions
        : LEGACY_EXPENSE_CATEGORIES.map((category) => ({
            label: category.toLowerCase(),
            value: category,
        }));

    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [categoryId, setCategoryId] = useState<string>(defaultCategoryId);
    const [dueDate, setDueDate] = useState(() => new Date().toISOString().split("T")[0]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const selectedCat = categories.find(c => c.id === categoryId);

        const res = await createExpense({
            description,
            amount: Number(amount),
            category: selectedCat?.name || "OTROS",
            categoryId,
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
                <Button className="bg-success hover:bg-success/90 text-primary-foreground cursor-pointer">
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
                            <CategorySearchSelect
                                emptyMessage="No hay categorias configuradas"
                                onValueChange={setCategoryId}
                                options={categoryOptions}
                                placeholder="Seleccione..."
                                value={categoryId}
                            />
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

                    <Button type="submit" disabled={loading} className="w-full bg-primary/90 text-primary-foreground hover:bg-primary/90 cursor-pointer">
                        {loading ? "Guardando..." : "Guardar Gasto Fijo"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

