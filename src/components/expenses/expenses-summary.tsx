import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, AlertCircle, CheckCircle } from "lucide-react";

interface ExpensesSummaryProps {
    summary: {
        totalGastos: number;
        totalPagado: number;
        totalPendiente: number;
    };
}

export function ExpensesSummary({ summary }: ExpensesSummaryProps) {
    const { totalGastos, totalPagado, totalPendiente } = summary;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-500">Total Gastos Fijos</CardTitle>
                    <DollarSign className="w-4 h-4 text-zinc-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-zinc-800">${totalGastos.toLocaleString("es-AR")}</div>
                    <p className="text-xs text-zinc-500 mt-1">Acumulado del período seleccionado</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-600">Total Pagado</CardTitle>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">${totalPagado.toLocaleString("es-AR")}</div>
                    <p className="text-xs text-zinc-500 mt-1">Gastos marcados como abonados</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-rose-600">Total Pendiente</CardTitle>
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-rose-600">${totalPendiente.toLocaleString("es-AR")}</div>
                    <p className="text-xs text-zinc-500 mt-1">Gastos que aún faltan abonar</p>
                </CardContent>
            </Card>
        </div>
    );
}
