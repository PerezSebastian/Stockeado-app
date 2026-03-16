"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createProduct } from "@/actions/inventory";

const productSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    sku: z.string().min(0),
    category: z.string().min(0),
    cost: z.number().min(0),
    price: z.number().min(0),
    stock: z.number().int().min(0),
    minStock: z.number().int().min(0),
    isPublic: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function CreateProductSheet() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            sku: "",
            category: "",
            cost: 0,
            price: 0,
            stock: 0,
            minStock: 0,
            isPublic: false,
        },
    });

    async function onSubmit(values: ProductFormValues) {
        setLoading(true);
        try {
            const res = await createProduct(values);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(res.success);
                form.reset();
                setOpen(false);
            }
        } catch (error) {
            toast.error("Error al crear el producto");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="shrink-0 bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer transition-transform active:scale-95">
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir Producto
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Añadir Nuevo Producto</SheetTitle>
                    <SheetDescription>
                        Ingresa los detalles del producto para tu catálogo.
                    </SheetDescription>
                </SheetHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre del Producto</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Remera Algodón" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="sku"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SKU (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="TSH-001" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoría</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ropa" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="cost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Costo ($)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Venta ($)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="stock"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Stock Inicial</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="minStock"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Alerta Stock Mín.</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="isPublic"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Público en Catálogo</FormLabel>
                                        <SheetDescription>
                                            Habilitar para mostrar en tu landing page.
                                        </SheetDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} className="bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer">
                                {loading ? "Guardando..." : "Guardar Producto"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
