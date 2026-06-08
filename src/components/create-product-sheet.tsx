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
import { BarcodeScannerButton } from "@/components/barcode-scanner-button";
import { CategorySearchSelect } from "@/components/category-search-select";
import { createProduct } from "@/actions/inventory";
import { Category } from "@prisma/client";

const productSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    sku: z.string().min(0),
    category: z.string().min(0).optional(),
    categoryId: z.string().min(1, "Selecciona una categoría"),
    cost: z.number().min(0),
    price: z.number().min(0),
    stock: z.number().int().min(0),
    minStock: z.number().int().min(0),
});

type ProductFormValues = z.infer<typeof productSchema>;
type CategoryWithStatus = Category & { isActive?: boolean };

interface CreateProductSheetProps {
    categories: CategoryWithStatus[];
}

export function CreateProductSheet({ categories }: CreateProductSheetProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const productCategoryOptions = categories
        .filter((category) => category.type === "PRODUCT" && category.isActive !== false)
        .map((category) => ({
            label: category.name,
            value: category.id,
        }));

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            sku: "",
            category: "",
            categoryId: "",
            cost: 0,
            price: 0,
            stock: 0,
            minStock: 0,
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
        } catch {
            toast.error("Error al crear el producto");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-transform active:scale-95">
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
                                            <div className="flex flex-col gap-2">
                                                <Input placeholder="TSH-001" {...field} />
                                                <BarcodeScannerButton
                                                    buttonLabel="Código"
                                                    onDetected={(code) => field.onChange(code)}
                                                    className="w-full"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoría</FormLabel>
                                        <FormControl>
                                            <CategorySearchSelect
                                                emptyMessage="No hay categorias configuradas"
                                                onValueChange={field.onChange}
                                                options={productCategoryOptions}
                                                value={field.value}
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
                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                                {loading ? "Guardando..." : "Guardar Producto"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}

