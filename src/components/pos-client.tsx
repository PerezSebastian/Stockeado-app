"use client";

import { useState, useMemo } from "react";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    CreditCard,
    ShoppingCart,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { createSale } from "@/actions/pos";
import { BarcodeScannerButton } from "@/components/barcode-scanner-button";

interface Product {
    id: string;
    name: string;
    sku: string | null;
    category: string | null;
    price: number;
    stock: number;
}

interface CartItem extends Product {
    qty: number;
}

interface POSClientProps {
    products: Product[];
}

const PAYMENT_METHODS = [
    { value: "Efectivo", label: "💵 Efectivo" },
    { value: "Débito", label: "💳 Débito" },
    { value: "Crédito", label: "💳 Crédito" },
    { value: "Transferencia", label: "🏦 Transferencia" },
];

export function POSClient({ products }: POSClientProps) {
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("Efectivo");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    // Filtrado en cliente
    const [debouncedSearch] = useDebounce(search, 300);

    const filtered = useMemo(() => {
        const q = debouncedSearch.toLowerCase().trim();
        if (!q) return products;
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.sku ?? "").toLowerCase().includes(q)
        );
    }, [products, debouncedSearch]);

    const addToCart = (product: Product) => {
        setCart((curr) => {
            const existing = curr.find((p) => p.id === product.id);
            if (existing) {
                return curr.map((p) =>
                    p.id === product.id ? { ...p, qty: p.qty + 1 } : p
                );
            }
            return [...curr, { ...product, qty: 1 }];
        });
    };

    const handleBarcodeDetected = (code: string) => {
        const normalizedCode = code.trim();
        setSearch(normalizedCode);

        const product = products.find(
            (p) => (p.sku ?? "").trim().toLowerCase() === normalizedCode.toLowerCase()
        );

        if (!product) {
            toast.error(`No encontramos un producto con el código "${normalizedCode}"`);
            return;
        }

        addToCart(product);
    };

    const updateQty = (id: string, delta: number) => {
        setCart((curr) =>
            curr.map((p) =>
                p.id === id ? { ...p, qty: Math.max(1, p.qty + delta) } : p
            )
        );
    };

    const removeItem = (id: string) => {
        setCart((curr) => curr.filter((p) => p.id !== id));
    };

    const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const res = await createSale({
                items: cart.map((item) => ({
                    productId: item.id,
                    quantity: item.qty,
                    unitPrice: item.price,
                })),
                paymentMethod,
                notes: notes.trim() || undefined,
            });

            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(res.success ?? "Venta registrada");
                setCart([]);
                setNotes("");
                setPaymentMethod("Efectivo");
                setCheckoutOpen(false);
            }
        } catch {
            toast.error("Error al procesar la venta");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full lg:h-[calc(100vh-8rem)]">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Punto de Venta</h1>
                <p className="text-muted-foreground">Seleccioná los productos y registrá la venta.</p>
            </div>

            <div className="flex flex-col-reverse lg:flex-row gap-6 flex-1 min-h-0">

                {/* ── Panel Izquierdo: Catálogo ── */}
                <div className="flex-1 flex flex-col space-y-4 min-w-0">

                <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative w-full">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o SKU..."
                            className="pl-8 bg-background border-border shadow-sm"
                        />
                    </div>
                    <BarcodeScannerButton
                        onDetected={handleBarcodeDetected}
                        className="h-10 w-full sm:w-auto shrink-0"
                    />
                </div>

                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-2 min-h-[200px]">
                        <Search className="h-10 w-10 opacity-20" />
                        <p className="text-sm">No se encontraron productos</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1 pb-4">
                        {filtered.map((p) => {
                            const outOfStock = p.stock <= 0;
                            const inCart = cart.find((c) => c.id === p.id);
                            return (
                                <Card
                                    key={p.id}
                                    className={`transition-all border-2 bg-background ${outOfStock
                                        ? "opacity-50 border-border/50 cursor-not-allowed select-none"
                                        : inCart
                                            ? "cursor-pointer border-primary shadow-md"
                                            : "cursor-pointer border-border hover:border-border/80 hover:shadow-sm"
                                        }`}
                                    onClick={outOfStock ? undefined : () => addToCart(p)}
                                >
                                    <CardContent className="p-3 flex flex-col justify-between h-full space-y-3">
                                        <div>
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                                {p.sku || "—"}
                                            </p>
                                            <p className="font-semibold text-sm leading-tight text-foreground line-clamp-2 mt-0.5">
                                                {p.name}
                                            </p>
                                        </div>
                                        <div className="flex items-end justify-between gap-1 flex-wrap">
                                            <span className="font-bold text-base text-foreground">
                                                ${p.price.toLocaleString("es-AR")}
                                            </span>
                                            {outOfStock ? (
                                                <Badge className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/10">
                                                    Sin Stock
                                                </Badge>
                                            ) : (
                                                <span className="text-[10px] font-semibold text-muted-foreground bg-surface-subtle px-2 py-0.5 rounded">
                                                    {p.stock} uds.
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Panel Derecho: Ticket ── */}
            <div className="w-full lg:w-[380px] flex flex-col bg-background rounded-xl border border-border overflow-hidden shadow-sm shrink-0 max-h-[340px] lg:max-h-none">
                {/* Header ticket */}
                <div className="p-4 bg-surface-subtle/80 border-b border-border flex justify-between items-center">
                    <h2 className="font-semibold text-foreground tracking-tight flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Ticket de Venta
                    </h2>
                    {cartCount > 0 && (
                        <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            {cartCount}
                        </span>
                    )}
                </div>

                {/* Items del carrito */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground space-y-1">
                            <ShoppingCart className="h-8 w-8 opacity-20" />
                            <p className="text-xs font-semibold">El ticket está vacío</p>
                            <p className="text-[10px] text-center opacity-80">Hacé clic en un producto o escaneá para agregarlo</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="flex gap-3 border-b border-border/50 pb-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-tight text-foreground truncate">
                                        {item.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        ${item.price.toLocaleString("es-AR")} c/u
                                    </p>
                                </div>
                                <div className="flex flex-col items-end justify-between shrink-0">
                                    <span className="font-bold text-sm text-foreground">
                                        ${(item.price * item.qty).toLocaleString("es-AR")}
                                    </span>
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-6 w-6 rounded border-border"
                                            onClick={() => updateQty(item.id, -1)}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-sm font-semibold w-5 text-center text-foreground">
                                            {item.qty}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-6 w-6 rounded border-border"
                                            onClick={() => updateQty(item.id, 1)}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded text-danger-soft-foreground hover:text-danger-soft-foreground hover:bg-danger-soft ml-0.5"
                                            onClick={() => removeItem(item.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer con total y botón (sólo visible si hay items) */}
                {cart.length > 0 && (
                    <div className="p-4 bg-surface-subtle border-t border-border space-y-4">
                        <div className="flex justify-between items-baseline">
                            <span className="text-muted-foreground text-sm font-medium">Total</span>
                            <span className="text-3xl font-black tracking-tight text-foreground">
                                ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <Button
                            disabled={cart.length === 0}
                            onClick={() => setCheckoutOpen(true)}
                            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                        >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Cobrar Venta
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Dialog de Cobro ── */}
            <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Confirmar Venta</DialogTitle>
                        <DialogDescription>
                            Revisá el resumen antes de registrar la venta.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Resumen del ticket */}
                    <div className="space-y-3 py-2">
                        <div className="bg-surface-subtle rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto">
                            {cart.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground truncate mr-2">
                                        {item.qty}× {item.name}
                                    </span>
                                    <span className="font-medium text-foreground shrink-0">
                                        ${(item.price * item.qty).toLocaleString("es-AR")}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <span className="text-muted-foreground text-sm">Total a cobrar</span>
                            <span className="font-black text-2xl text-foreground">
                                ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Método de pago */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">
                                Método de pago
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {PAYMENT_METHODS.map((m) => (
                                    <button
                                        key={m.value}
                                        type="button"
                                        onClick={() => setPaymentMethod(m.value)}
                                        className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all ${paymentMethod === m.value
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-background text-foreground hover:border-primary/40"
                                            }`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notas */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">
                                Notas <span className="font-normal text-muted-foreground">(opcional)</span>
                            </label>
                            <Input
                                placeholder="Ej: cliente habitual, descuento aplicado..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="bg-background border-border"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
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
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {loading ? "Registrando..." : "Confirmar Venta"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
        </div>
    );
}
