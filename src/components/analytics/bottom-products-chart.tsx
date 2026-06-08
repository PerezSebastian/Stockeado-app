"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BottomProductsChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-foreground">Productos Menos Vendidos</CardTitle>
                    <CardDescription>No hay datos suficientes</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No se registran ventas para el periodo seleccionado.
                </CardContent>
            </Card>
        );
    }

    const maxQty = Math.max(...data.map(d => d.qty));

    return (
        <Card className="flex flex-col">
            <CardHeader className="shrink-0 pb-2">
                <CardTitle className="text-foreground">Menos Vendidos (con ventas)</CardTitle>
                <CardDescription>Productos de baja rotación temporal</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 mt-4">
                <div className="space-y-5">
                    {data.map((item, index) => (
                        <div key={index} className="space-y-1.5 flex flex-col">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-semibold text-foreground">{item.name}</span>
                                <span className="text-destructive font-bold">${Number(item.revenue).toLocaleString("es-AR")}</span>
                            </div>
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
                                <div
                                    className="h-full bg-destructive rounded-full transition-all duration-1000 ease-in-out"
                                    style={{ width: `${(item.qty / maxQty) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground text-right">{item.qty} un.</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

