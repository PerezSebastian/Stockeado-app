"use client"
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Minus, Trash2, CreditCard, ShoppingCart } from "lucide-react";

// Mock data
const mockProducts = [
    { id: "1", sku: "TSH-001", name: "Remera Básica Algodón", price: 3500, stock: 45 },
    { id: "2", sku: "PNT-002", name: "Pantalón Cargo Black", price: 8900, stock: 8 },
    { id: "3", sku: "ACC-001", name: "Gorra Trucker Logo", price: 2500, stock: 110 },
    { id: "4", sku: "SHO-004", name: "Zapatillas Urbanas", price: 29000, stock: 12 },
];

export default function POSPage() {
    const [cart, setCart] = useState<any[]>([]);

    const addToCart = (product: any) => {
        setCart((curr) => {
            const existing = curr.find((p) => p.id === product.id);
            if (existing) {
                return curr.map((p) => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
            }
            return [...curr, { ...product, qty: 1 }];
        });
    };

    const updateQty = (id: string, delta: number) => {
        setCart((curr) => curr.map((p) => {
            if (p.id === id) {
                const newQty = Math.max(1, p.qty + delta);
                return { ...p, qty: newQty };
            }
            return p;
        }));
    };

    const removeItem = (id: string) => {
        setCart((curr) => curr.filter((p) => p.id !== id));
    };

    const total = cart.reduce((acc, current) => acc + (current.price * current.qty), 0);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">

            {/* Left Panel: Product List */}
            <div className="flex-1 flex flex-col space-y-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Punto de Venta</h1>
                    <p className="text-zinc-500">Abre un nuevo ticket de venta.</p>
                </div>

                <div className="relative w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        type="search"
                        placeholder="Buscar por código de barras, SKU o nombre..."
                        className="pl-8 bg-white border-zinc-200 shadow-sm"
                    />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
                    {mockProducts.map((p) => (
                        <Card
                            key={p.id}
                            className="cursor-pointer hover:border-zinc-400 transition-colors bg-white hover:shadow-sm"
                            onClick={() => addToCart(p)}
                        >
                            <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                                <div>
                                    <p className="text-xs text-zinc-500">{p.sku}</p>
                                    <p className="font-medium text-sm leading-tight text-zinc-800 line-clamp-2">{p.name}</p>
                                </div>
                                <div className="flex items-end justify-between">
                                    <span className="font-bold text-lg">${p.price.toLocaleString('es-AR')}</span>
                                    <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-2 py-1 rounded">Stock: {p.stock}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Right Panel: Cart */}
            <div className="w-full lg:w-[400px] flex flex-col bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-zinc-50/80 border-b border-zinc-200 flex justify-between items-center">
                    <h2 className="font-semibold text-zinc-800 tracking-tight">Ticket de Venta</h2>
                    <span className="text-sm font-medium text-zinc-500">{cart.length} items</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2">
                            <ShoppingCart className="h-12 w-12 opacity-20" />
                            <p className="text-sm">El carrito está vacío</p>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.id} className="flex gap-3 border-b border-zinc-100 pb-4">
                                <div className="flex-1">
                                    <p className="text-sm font-medium leading-tight text-zinc-800">{item.name}</p>
                                    <p className="text-xs text-zinc-500 mt-1">${item.price.toLocaleString('es-AR')} c/u</p>
                                </div>
                                <div className="flex flex-col items-end justify-between">
                                    <span className="font-bold text-sm text-zinc-900">${(item.price * item.qty).toLocaleString('es-AR')}</span>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Button variant="outline" size="icon" className="h-6 w-6 rounded border-zinc-200" onClick={() => updateQty(item.id, -1)}>
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                                        <Button variant="outline" size="icon" className="h-6 w-6 rounded border-zinc-200" onClick={() => updateQty(item.id, 1)}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded text-red-500 ml-1 hover:text-red-600 hover:bg-red-50" onClick={() => removeItem(item.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-zinc-50 border-t border-zinc-200 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-zinc-600 text-lg">Total</span>
                        <span className="text-3xl font-black tracking-tight text-zinc-900">${total.toLocaleString('es-AR')}</span>
                    </div>
                    <Button disabled={cart.length === 0} className="w-full h-14 text-lg font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-md">
                        <CreditCard className="w-5 h-5 mr-2" />
                        Cobrar Venta
                    </Button>
                </div>
            </div>
        </div>
    );
}
