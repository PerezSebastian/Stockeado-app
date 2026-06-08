"use client";

import { useRouter } from "next/navigation";
import { AnalyticsPeriod } from "@/actions/analytics";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { TopProductsChart } from "./analytics/top-products-chart";
import { BottomProductsChart } from "./analytics/bottom-products-chart";
import { SalesByHourChart } from "./analytics/sales-by-hour-chart";
import { PaymentMethodsChart } from "./analytics/payment-methods-chart";
import { RevenueChart } from "./analytics/revenue-chart";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ReceiptText } from "lucide-react";

interface AnalyticsData {
    totalRevenue: number;
    totalTickets: number;
    topProducts: any[];
    bottomProducts: any[];
    paymentData: any[];
    hoursData: any[];
    revenueData: any[];
}

export function AnalyticsDashboardClient({
    initialData,
    currentPeriod,
}: {
    initialData: AnalyticsData;
    currentPeriod: AnalyticsPeriod;
}) {
    const router = useRouter();

    const handlePeriodChange = (val: string) => {
        router.push(`/dashboard/analytics?p=${val}`);
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center justify-between">
                <Select value={currentPeriod} onValueChange={handlePeriodChange}>
                    <SelectTrigger className="w-[180px] bg-background">
                        <SelectValue placeholder="Seleccionar Periodo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TODAY">Hoy</SelectItem>
                        <SelectItem value="7_DAYS">Últimos 7 días</SelectItem>
                        <SelectItem value="THIS_MONTH">Este mes</SelectItem>
                        <SelectItem value="THIS_YEAR">Este año</SelectItem>
                        <SelectItem value="ALL_TIME">Histórico Completo</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Ingresos</CardTitle>
                        <DollarSign className="h-4 w-4 text-success" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-foreground">
                            ${Number(initialData.totalRevenue).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Transacciones</CardTitle>
                        <ReceiptText className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-foreground">
                            {initialData.totalTickets}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* First Row Charts: Top & Bottom Products */}
            <div className="grid gap-6 md:grid-cols-2">
                <TopProductsChart data={initialData.topProducts} />
                <BottomProductsChart data={initialData.bottomProducts} />
            </div>

            {/* Second Row Charts: Hours & Revenue */}
            <div className="grid gap-6 md:grid-cols-2">
                <SalesByHourChart data={initialData.hoursData} />
                <RevenueChart data={initialData.revenueData} />
            </div>

            {/* Third Row Charts: Payment Methods */}
            <div className="grid gap-6 md:grid-cols-2">
                <PaymentMethodsChart data={initialData.paymentData} />
            </div>
        </div>
    );
}

