"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Label, Cell } from "recharts";

export function PaymentMethodsChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-zinc-800">Métodos de Pago</CardTitle>
                    <CardDescription>No hay datos suficientes</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-sm text-zinc-500">
                    No hay registro de pagos.
                </CardContent>
            </Card>
        );
    }

    const totalRevenue = data.reduce((acc, curr) => acc + curr.value, 0);
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    // Using ChartContainer requires a config
    const chartConfig = useMemo(() => {
        const config: Record<string, any> = {
            value: {
                label: "Monto",
            }
        };
        const baseColors = [
            "#10b981", // emerald-500
            "#3b82f6", // blue-500
            "#facc15", // yellow-400
            "#a855f7", // purple-500
            "#ec4899", // pink-500
            "#27272a", // zinc-800
        ];

        sortedData.forEach((item, i) => {
            const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            config[key] = {
                label: item.name,
                color: baseColors[i % baseColors.length]
            };
        });
        return config;
    }, [sortedData]);

    const chartData = useMemo(() => {
        return sortedData.map((item, i) => {
            const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            return {
                ...item,
                paymentMethod: key,
                fill: `var(--color-${key})`
            };
        });
    }, [sortedData]);

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="items-center pb-0">
                <CardTitle className="text-zinc-800">Métodos de Pago</CardTitle>
                <CardDescription>Distribución de ingresos según medio</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0 mt-4">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-[4/3] max-h-[250px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel formatter={(value: any, name: any) => `$${Number(value).toLocaleString("es-AR")}`} />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={70}
                            outerRadius={100}
                            strokeWidth={3}
                            paddingAngle={3}
                        >
                            {chartData.map((entry, index) => {
                                const key = entry.paymentMethod;
                                return (
                                    <Cell key={`cell-${index}`} fill={`var(--color-${key})`} />
                                );
                            })}
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-zinc-800 text-xl font-bold"
                                                >
                                                    ${totalRevenue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 20}
                                                    className="fill-zinc-400 text-xs"
                                                >
                                                    Total Ingresos
                                                </tspan>
                                            </text>
                                        );
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm pt-6 pb-6">
                <div className="flex w-full flex-wrap justify-center gap-4">
                    {chartData.map((item, index) => {
                        const key = item.paymentMethod;
                        const percentage = ((item.value / totalRevenue) * 100).toFixed(1);
                        return (
                            <div key={index} className="flex items-center gap-2">
                                <div
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: chartConfig[key]?.color }}
                                />
                                <span className="text-zinc-700 font-medium">{item.name}</span>
                                <span className="text-zinc-500 hidden sm:inline">{percentage}%</span>
                            </div>
                        );
                    })}
                </div>
            </CardFooter>
        </Card>
    );
}
