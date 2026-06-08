"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, Time, AreaSeries } from "lightweight-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveChartColor, withAlpha } from "@/lib/lightweight-chart-colors";

export function RevenueChart({ data }: { data: any[] }) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    const hasData = data && data.length > 0;

    useEffect(() => {
        if (!hasData || !chartContainerRef.current) return;

        const mutedForeground = resolveChartColor("var(--muted-foreground)", "#71717a");
        const borderColor = withAlpha("var(--border)", 0.7, "rgba(228, 228, 231, 0.7)");
        const lineColor = resolveChartColor("var(--chart-1)", "#10b981");
        const topColor = withAlpha("var(--chart-1)", 0.4, "rgba(16, 185, 129, 0.4)");
        const bottomColor = withAlpha("var(--chart-1)", 0, "rgba(16, 185, 129, 0)");

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: mutedForeground,
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { color: borderColor, style: 3 },
            },
            rightPriceScale: {
                borderVisible: false,
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: {
                horzLine: { visible: true, labelVisible: true },
                vertLine: { visible: true, labelVisible: true },
            },
            height: 300,
        });

        chartRef.current = chart;

        const areaSeries = chart.addSeries(AreaSeries, {
            lineColor,
            topColor,
            bottomColor,
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });

        // Parse data
        const formattedData = data.map(item => {
            // Business day string directly, or unix timestamp
            const timePayload = typeof item.time === 'number'
                ? (item.time as Time)
                : (item.time as string as Time);

            return {
                time: timePayload,
                value: item.value,
            };
        });

        // Deduplicate or ensure strictly ascending if needed, but the server already returns strictly ascending.
        areaSeries.setData(formattedData);

        chart.timeScale().fitContent();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, hasData]);

    if (!hasData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-foreground">Evolución de Ingresos</CardTitle>
                    <CardDescription>No hay datos suficientes</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                    No se registran transacciones.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex flex-col">
            <CardHeader className="shrink-0">
                <CardTitle className="text-foreground">Evolución de Ingresos</CardTitle>
                <CardDescription>Progreso detallado del periodo</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pb-6 pr-6 pl-2 flex-1">
                <div ref={chartContainerRef} className="w-full h-full min-h-[300px]" />
            </CardContent>
        </Card>
    );
}

