"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { createPaymentMethod, togglePaymentMethodStatus, deletePaymentMethod } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, CreditCard, Loader2 } from "lucide-react";
import { PaymentMethod } from "@prisma/client";

interface PaymentListProps {
    initialMethods: PaymentMethod[];
}

export function PaymentList({ initialMethods }: PaymentListProps) {
    const [isPending, startTransition] = useTransition();
    const [newName, setNewName] = useState("");

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        startTransition(async () => {
            const result = await createPaymentMethod(newName);
            if (result.error) toast.error(result.error);
            else {
                toast.success("Método de pago añadido");
                setNewName("");
            }
        });
    };

    const handleToggle = async (id: string, current: boolean) => {
        startTransition(async () => {
            const result = await togglePaymentMethodStatus(id, current);
            if (result.error) toast.error(result.error);
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este método de pago?")) return;
        startTransition(async () => {
            const result = await deletePaymentMethod(id);
            if (result.error) toast.error(result.error);
            else toast.success("Eliminado correctamente");
        });
    };

    return (
        <div className="space-y-6">
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Nuevo Método de Pago
                    </CardTitle>
                    <CardDescription>MercadoPago, Transferencia, etc.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="method-name">Nombre</Label>
                            <Input 
                                id="method-name" 
                                value={newName} 
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Ej: MercadoPago, Cuenta Corriente..."
                                className="h-10 border-border"
                            />
                        </div>
                        <Button 
                            disabled={isPending || !newName.trim()} 
                            type="submit"
                            className="bg-primary text-primary-foreground h-10 px-6 rounded-xl shadow-sm transition-all active:scale-[0.98]"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Añadir"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="grid gap-4">
                {initialMethods.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border-2 border-dashed border-border bg-surface-subtle/50">
                        <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">No has configurado métodos de pago personalizados.</p>
                        <p className="text-muted-foreground text-sm">Los métodos por defecto aparecerán aquí una vez creados.</p>
                    </div>
                ) : (
                    initialMethods.map((method) => (
                        <Card key={method.id} className={`border-border transition-all ${!method.isActive ? 'opacity-60 grayscale-[0.5]' : 'shadow-sm'}`}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${method.isActive ? 'bg-surface-subtle text-foreground' : 'bg-surface-subtle text-muted-foreground'}`}>
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground">{method.name}</h3>
                                        <p className="text-xs text-muted-foreground">{method.isActive ? "Activo en el POS" : "Deshabilitado"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3 pr-4 border-r border-border">
                                        <Label htmlFor={`active-${method.id}`} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:block">Estado</Label>
                                        <Switch 
                                            id={`active-${method.id}`}
                                            checked={method.isActive}
                                            onCheckedChange={() => handleToggle(method.id, method.isActive)}
                                            disabled={isPending}
                                        />
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleDelete(method.id)}
                                        className="text-muted-foreground hover:text-danger-soft-foreground hover:bg-danger-soft transition-colors"
                                        disabled={isPending}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

