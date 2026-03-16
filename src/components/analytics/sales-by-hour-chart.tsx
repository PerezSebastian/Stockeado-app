"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, Time, HistogramSeries } from "lightweight-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SalesByHourChart({ data }: { data: any[] }) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    const hasData = data && data.some(d => d.value > 0);

    useEffect(() => {
        if (!hasData || !chartContainerRef.current) return;

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#71717a', // zinc-500
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { color: '#f4f4f5', style: 3 },
            },
            rightPriceScale: {
                borderVisible: false,
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
                tickMarkFormatter: (time: number) => {
                    // Turn timestamp back into hour locally
                    const d = new Date(time * 1000);
                    return `${d.getHours().toString().padStart(2, '0')}:00`;
                }
            },
            crosshair: {
                mode: 0, // Normal mode
                vertLine: { visible: true, labelVisible: true },
                horzLine: { visible: true, labelVisible: true },
            },
            height: 300,
        });

        chartRef.current = chart;

        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#3b82f6', // blue-500
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });

        const formattedData = data.map(item => ({
            time: item.time as Time,
            value: item.value,
            color: item.value > 0 ? '#3b82f6' : 'rgba(59, 130, 246, 0.2)', // Dim zero vals
        }));

        volumeSeries.setData(formattedData);

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
                    <CardTitle className="text-zinc-800">Ventas por Rango Horario</CardTitle>
                    <CardDescription>No hay datos suficientes</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-sm text-zinc-500">
                    No se registran transacciones.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex flex-col">
            <CardHeader className="shrink-0">
                <CardTitle className="text-zinc-800">Ventas por Rango Horario</CardTitle>
                <CardDescription>Volumen de venta según la hora del día</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pb-6 pr-6 pl-2 flex-1">
                <div ref={chartContainerRef} className="w-full h-full min-h-[300px]" />
            </CardContent>
        </Card>
    );
}
