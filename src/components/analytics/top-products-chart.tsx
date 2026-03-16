"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TopProductsChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-zinc-800">Productos Más Vendidos</CardTitle>
                    <CardDescription>No hay datos suficientes</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-sm text-zinc-500">
                    No se registran ventas para el periodo seleccionado.
                </CardContent>
            </Card>
        );
    }

    const maxQty = Math.max(...data.map(d => d.qty));

    return (
        <Card className="flex flex-col">
            <CardHeader className="shrink-0 pb-2">
                <CardTitle className="text-zinc-800">Productos Más Vendidos</CardTitle>
                <CardDescription>Principales motores de ingresos</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 mt-4">
                <div className="space-y-5">
                    {data.map((item, index) => (
                        <div key={index} className="space-y-1.5 flex flex-col">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-semibold text-zinc-800">{item.name}</span>
                                <span className="text-emerald-600 font-bold">${Number(item.revenue).toLocaleString("es-AR")}</span>
                            </div>
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-in-out"
                                    style={{ width: `${(item.qty / maxQty) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs text-zinc-400 text-right">{item.qty} un.</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
