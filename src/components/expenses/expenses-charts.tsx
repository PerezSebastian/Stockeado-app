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
    "Alquiler": "var(--chart-1)",
    "Luz": "var(--chart-2)",
    "Agua": "var(--chart-3)",
    "Internet": "var(--chart-4)",
    "Sueldos": "var(--chart-5)",
    "Impuestos": "var(--chart-1)",
    "Limpieza": "var(--chart-2)",
    "Seguro": "var(--chart-3)",
    "Mantenimiento": "var(--chart-4)",
    "Suscripciones": "var(--chart-5)",
    "Otros": "var(--muted-foreground)"
};

const FALLBACK_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

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
            <Card className="col-span-1 lg:col-span-2 shadow-sm border-border/60 flex flex-col items-center justify-center p-12">
                <div className="w-16 h-16 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Sin datos registrados</h3>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                    No se encontraron gastos fijos para el periodo seleccionado.
                </p>
            </Card>
        );
    }

    return (
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-border/60 transition-all duration-300 hover:shadow-md group flex flex-col">
            <CardHeader className="items-start pb-6">
                <div className="flex flex-col space-y-1.5">
                    <CardTitle className="text-2xl font-bold text-foreground tracking-tight">Evolución de Gastos</CardTitle>
                    <CardDescription className="text-sm font-medium text-muted-foreground">
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
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                                tickFormatter={(value) => `$${value.toLocaleString()}`}
                            />
                            <Tooltip
                                cursor={{ fill: "var(--surface-subtle)" }}
                                content={
                                    <ChartTooltipContent
                                        indicator="dot"
                                        className="bg-background/95 backdrop-blur-md shadow-xl border-border"
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
                                        <Cell key={`cell-${index}`} fill={chartConfig[entry.label]?.color || "var(--muted-foreground)"} />
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

