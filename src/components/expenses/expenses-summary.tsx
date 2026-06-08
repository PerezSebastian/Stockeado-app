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
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Gastos Fijos</CardTitle>
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-foreground">${totalGastos.toLocaleString("es-AR")}</div>
                    <p className="text-xs text-muted-foreground mt-1">Acumulado del período seleccionado</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-success">Total Pagado</CardTitle>
                    <CheckCircle className="w-4 h-4 text-success" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-success">${totalPagado.toLocaleString("es-AR")}</div>
                    <p className="text-xs text-muted-foreground mt-1">Gastos marcados como abonados</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-danger-soft-foreground">Total Pendiente</CardTitle>
                    <AlertCircle className="w-4 h-4 text-danger-soft-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-danger-soft-foreground">${totalPendiente.toLocaleString("es-AR")}</div>
                    <p className="text-xs text-muted-foreground mt-1">Gastos que aún faltan abonar</p>
                </CardContent>
            </Card>
        </div>
    );
}

