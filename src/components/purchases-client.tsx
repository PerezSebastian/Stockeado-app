"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Search,
    Plus,
    Minus,
    Trash2,
    Truck,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { createPurchaseAction } from "@/actions/purchases";
import { useRouter } from "next/navigation";

interface Product {
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    cost: number;
    stock: number;
}

interface CartItem extends Product {
    qty: number;
    unitCost: number;
}

interface PurchasesClientProps {
    products: Product[];
}

export function PurchasesClient({ products }: PurchasesClientProps) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [supplierName, setSupplierName] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    // Filtrado en cliente
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return products;
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.sku ?? "").toLowerCase().includes(q)
        );
    }, [products, search]);

    const addToCart = (product: Product) => {
        setCart((curr) => {
            const existing = curr.find((p) => p.id === product.id);
            if (existing) {
                return curr.map((p) =>
                    p.id === product.id ? { ...p, qty: p.qty + 1 } : p
                );
            }
            return [...curr, { ...product, qty: 1, unitCost: product.cost }];
        });
    };

    const updateQty = (id: string, delta: number) => {
        setCart((curr) =>
            curr.map((p) =>
                p.id === id ? { ...p, qty: Math.max(1, p.qty + delta) } : p
            )
        );
    };

    const updateCost = (id: string, newCost: string) => {
        const parsed = parseFloat(newCost);
        if (isNaN(parsed) || parsed < 0) return;
        setCart((curr) =>
            curr.map((p) =>
                p.id === id ? { ...p, unitCost: parsed } : p
            )
        );
    };

    const removeItem = (id: string) => {
        setCart((curr) => curr.filter((p) => p.id !== id));
    };

    const total = cart.reduce((acc, item) => acc + item.unitCost * item.qty, 0);
    const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const res = await createPurchaseAction(
                cart.map(item => ({
                    productId: item.id,
                    quantity: item.qty,
                    unitCost: item.unitCost
                })),
                total,
                supplierName.trim() || undefined,
                notes.trim() || undefined
            );

            if ("error" in res && res.error) {
                toast.error(res.error as string);
            } else {
                toast.success("success" in res ? (res.success as string) : "Compra registrada exitosamente");
                setCart([]);
                setNotes("");
                setSupplierName("");
                setCheckoutOpen(false);
                router.push("/dashboard/purchases");
                router.refresh();
            }
        } catch {
            toast.error("Error al procesar la compra");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-10rem)]">
            {/* ── Panel Izquierdo: Catálogo ── */}
            <div className="flex-1 flex flex-col space-y-4 min-w-0">
                <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar producto por nombre o SKU..."
                        className="pl-8 bg-white border-zinc-200 shadow-sm"
                    />
                </div>

                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-zinc-400 gap-2">
                        <Search className="h-10 w-10 opacity-20" />
                        <p className="text-sm">No se encontraron productos</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-1 pb-4">
                        {filtered.map((p) => {
                            const inCart = cart.find((c) => c.id === p.id);
                            return (
                                <Card
                                    key={p.id}
                                    className={`transition-all border-2 bg-white ${inCart
                                        ? "cursor-pointer border-emerald-600 shadow-md"
                                        : "cursor-pointer border-zinc-200 hover:border-emerald-400 hover:shadow-sm"
                                        }`}
                                    onClick={() => addToCart(p)}
                                >
                                    <CardContent className="p-3 flex flex-col justify-between h-full space-y-3">
                                        <div>
                                            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                                                {p.sku || "—"}
                                            </p>
                                            <p className="font-semibold text-sm leading-tight text-zinc-800 line-clamp-2 mt-0.5">
                                                {p.name}
                                            </p>
                                        </div>
                                        <div className="flex items-end justify-between gap-1 flex-wrap">
                                            <span className="font-bold text-sm text-zinc-500">
                                                Stock: {p.stock}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Panel Derecho: Resumen de Compra ── */}
            <div className="w-full lg:w-[450px] flex flex-col bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm shrink-0">
                {/* Header ticket */}
                <div className="p-4 bg-zinc-50/80 border-b border-zinc-200 flex justify-between items-center">
                    <h2 className="font-semibold text-zinc-800 tracking-tight flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Detalle de Ingreso
                    </h2>
                    {cartCount > 0 && (
                        <span className="text-xs font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            {cartCount} uds.
                        </span>
                    )}
                </div>

                {/* Items del carrito */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2">
                            <Truck className="h-12 w-12 opacity-20" />
                            <p className="text-sm">El listado está vacío</p>
                            <p className="text-xs text-center">Hacé clic en un producto para agregarlo al remito</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="flex flex-col gap-2 border border-zinc-100 bg-zinc-50/50 p-3 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <p className="text-sm font-semibold leading-tight text-zinc-800">
                                        {item.name}
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 -mt-1 -mr-1"
                                        onClick={() => removeItem(item.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>

                                <div className="flex gap-4 items-center mt-2">
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Costo Univ.</label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-2 text-zinc-500 text-xs">$</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unitCost}
                                                onChange={(e) => updateCost(item.id, e.target.value)}
                                                className="h-8 pl-5 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-24 shrink-0">
                                        <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Cantidad</label>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline" size="icon" className="h-8 w-8 rounded"
                                                onClick={() => updateQty(item.id, -1)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="text-sm font-semibold flex-1 text-center">
                                                {item.qty}
                                            </span>
                                            <Button
                                                variant="outline" size="icon" className="h-8 w-8 rounded"
                                                onClick={() => updateQty(item.id, 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="text-right w-20 shrink-0">
                                        <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Subtotal</label>
                                        <span className="font-bold text-sm text-zinc-900">
                                            ${(item.unitCost * item.qty).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer con total y botón */}
                <div className="p-4 bg-zinc-50 border-t border-zinc-200 space-y-4">
                    <div className="flex justify-between items-baseline">
                        <span className="text-zinc-500 text-sm font-semibold">Inversión Total</span>
                        <span className="text-3xl font-black tracking-tight text-emerald-600">
                            ${total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <Button
                        disabled={cart.length === 0}
                        onClick={() => setCheckoutOpen(true)}
                        className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Finalizar Ingreso
                    </Button>
                </div>
            </div>

            {/* ── Dialog de Confirmación ── */}
            <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Confirmar Ingreso de Mercadería</DialogTitle>
                        <DialogDescription>
                            Completá la información del proveedor para el registro.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between px-1 border-b border-zinc-100 pb-3">
                            <span className="text-zinc-500 font-semibold">Inversión Final</span>
                            <span className="font-black text-2xl text-emerald-600">
                                ${total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Proveedor */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-zinc-700">
                                Proveedor <span className="font-normal text-zinc-400">(opcional)</span>
                            </label>
                            <Input
                                placeholder="Ej: Distribuidora Mayorista S.A."
                                value={supplierName}
                                onChange={(e) => setSupplierName(e.target.value)}
                                className="bg-white border-zinc-200"
                            />
                        </div>

                        {/* Notas */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-zinc-700">
                                Notas de remito <span className="font-normal text-zinc-400">(opcional)</span>
                            </label>
                            <Input
                                placeholder="Ej: Factura Nº 0001-00004512"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="bg-white border-zinc-200"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setCheckoutOpen(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCheckout}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {loading ? "Registrando..." : "Registrar Compra"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
