"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface ExpensesChartsProps {
    chartData: any[];
    uniqueCategories: string[];
    filterType: "month" | "year" | "all";
}

// Mapa de colores vibrantes y modernos por categoría genérica
const CATEGORY_COLORS: Record<string, string> = {
    "Alquiler": "hsl(var(--chart-1))", // Rojo/Coral
    "Luz": "hsl(var(--chart-2))", // Teal/Cyan
    "Agua": "hsl(var(--chart-3))", // Azul
    "Internet": "hsl(var(--chart-4))", // Amarillo/Naranja
    "Sueldos": "hsl(var(--chart-5))", // Violeta/Indigo
    "Impuestos": "#8b5cf6",
    "Limpieza": "#ec4899",
    "Seguro": "#14b8a6",
    "Mantenimiento": "#f97316",
    "Suscripciones": "#6366f1",
    "Otros": "#64748b"
};

const FALLBACK_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e"];

export function ExpensesCharts({ chartData, uniqueCategories, filterType }: ExpensesChartsProps) {
    // Configuración para el componente ChartContainer de Shadcn
    const chartConfig = useMemo(() => {
        const config: Record<string, any> = {
            amount: { label: "Gasto", color: "hsl(var(--primary))" }
        };
        uniqueCategories.forEach((cat, index) => {
            config[cat] = {
                label: cat,
                color: CATEGORY_COLORS[cat] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
            };
        });
        return config;
    }, [uniqueCategories]);

    if (!chartData || chartData.length === 0) {
        return (
            <Card className="col-span-1 lg:col-span-2 shadow-sm border-zinc-200/60 flex flex-col items-center justify-center p-12">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-1">Sin datos registrados</h3>
                <p className="text-sm text-zinc-500 text-center max-w-xs">
                    No se encontraron gastos fijos para el periodo seleccionado.
                </p>
            </Card>
        );
    }

    return (
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-zinc-200/60 transition-all duration-300 hover:shadow-md group flex flex-col">
            <CardHeader className="items-start pb-6">
                <div className="flex flex-col space-y-1.5">
                    <CardTitle className="text-2xl font-bold text-zinc-900 tracking-tight">Evolución de Gastos</CardTitle>
                    <CardDescription className="text-sm font-medium text-zinc-500">
                        {filterType === "month" ? "Análisis mensual consolidado por categoría" : "Análisis histórico/anual desglosado"}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
                <ChartContainer
                    config={chartConfig}
                    className="w-full h-[350px]"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 32, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(228, 228, 231, 0.4)" />
                            <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tick={{ fill: '#71717a', fontSize: 12 }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tick={{ fill: '#71717a', fontSize: 12 }}
                                tickFormatter={(value) => `$${value.toLocaleString()}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(228, 228, 231, 0.2)' }}
                                content={
                                    <ChartTooltipContent
                                        indicator="dot"
                                        className="bg-white/95 backdrop-blur-md shadow-xl border-zinc-200"
                                        nameKey={filterType === "month" ? "label" : undefined}
                                        valueFormatter={(val: any) => ` $${Number(val).toLocaleString()}`}
                                        labelValueFormatter={(payload: any) =>
                                            filterType !== "month" && payload.totalAmount
                                                ? `$${Number(payload.totalAmount).toLocaleString()}`
                                                : ""
                                        }
                                    />
                                }
                            />
                            {/* Ocultamos leyenda si es mes, ya que el Graph por categoría la hace redundante */}
                            {filterType !== "month" ? (
                                // @ts-ignore - Recharts internally injects the payload prop
                                <ChartLegend content={<ChartLegendContent className="flex-wrap pt-4" />} />
                            ) : null}

                            {filterType === "month" ? (
                                <Bar
                                    dataKey="amount"
                                    radius={[4, 4, 4, 4]}
                                    className="transition-all duration-300"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={chartConfig[entry.label]?.color || "#64748b"} />
                                    ))}
                                </Bar>
                            ) : (
                                uniqueCategories.map((cat) => {
                                    return (
                                        <Bar
                                            key={cat}
                                            dataKey={cat}
                                            stackId="a"
                                            fill={chartConfig[cat].color}
                                            radius={
                                                uniqueCategories.length === 1 ? [4, 4, 4, 4] : [2, 2, 2, 2]
                                            }
                                            className="transition-all duration-300"
                                        />
                                    );
                                })
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
