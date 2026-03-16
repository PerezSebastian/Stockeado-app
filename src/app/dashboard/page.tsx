import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, ShoppingCart, Users, ArrowRightLeft, TrendingUp } from "lucide-react";
import { WelcomeToast } from "@/components/welcome-toast";
import { Suspense } from "react";
import { getDashboardStats } from "@/actions/dashboard";

export default async function DashboardPage() {
    const stats = await getDashboardStats();

    if ("error" in stats) {
        return (
            <div className="p-6 text-center text-red-500">
                <p>Error cargando estadísticas: {stats.error}</p>
            </div>
        );
    }

    const {
        totalSalesToday,
        ticketsToday,
        criticalStockProducts,
        activeProducts,
        recentSales,
        recentMovements
    } = stats;
    return (
        <div className="space-y-6">
            <Suspense fallback={null}>
                <WelcomeToast />
            </Suspense>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
                <p className="text-zinc-500">Resumen general de tu negocio y desempeño reciente.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Metric Cards (Real Data) */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-600">Ventas Hoy</CardTitle>
                        <DollarSign className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${totalSalesToday.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-xs text-zinc-500">Ingresos totales del día</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-600">Tickets Hoy</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{ticketsToday}</div>
                        <p className="text-xs text-zinc-500">Ventas cerradas hoy</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-600">Stock Crítico</CardTitle>
                        <Package className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{criticalStockProducts}</div>
                        <p className={`text-xs ${criticalStockProducts > 0 ? "text-red-500 font-semibold" : "text-emerald-500"}`}>
                            {criticalStockProducts > 0 ? "Requieren atención" : "Stock saludable"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-600">Productos Registrados</CardTitle>
                        <Users className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeProducts}</div>
                        <p className="text-xs text-zinc-500">Activos en el catálogo</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Ventas Recientes */}
                <Card className="col-span-1 border-emerald-100 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                            Ventas Recientes
                        </CardTitle>
                        <CardDescription>Tus últimos 5 ingresos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentSales.length === 0 ? (
                            <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-zinc-400 text-sm">
                                No hay ventas recientes hoy
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentSales.map(sale => (
                                    <div key={sale.id} className="flex items-center justify-between bg-zinc-50/50 p-3 rounded-lg border border-zinc-100">
                                        <div>
                                            <p className="font-semibold text-sm text-zinc-800">
                                                {sale.items[0]?.product?.name || "Varios"}
                                                <span className="text-zinc-400 font-normal ml-1">
                                                    {sale.items.length > 1 ? `y ${sale.items.length - 1} más` : ""}
                                                </span>
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {new Date(sale.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} • {sale.paymentMethod}
                                            </p>
                                        </div>
                                        <div className="font-black text-emerald-600">
                                            +${Number(sale.total).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Movimientos Recientes */}
                <Card className="col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowRightLeft className="h-5 w-5 text-zinc-600" />
                            Movimientos Recientes
                        </CardTitle>
                        <CardDescription>Últimas entradas/salidas de stock.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentMovements.length === 0 ? (
                            <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-zinc-400 text-sm">
                                No hay movimientos recientes
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentMovements.map(movement => (
                                    <div key={movement.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-100">
                                        <div>
                                            <p className="font-semibold text-sm text-zinc-800">
                                                {movement.product?.name || "Producto genérico"}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {new Date(movement.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} • {movement.reason || "Sin especificar"}
                                            </p>
                                        </div>
                                        <div className={`font-bold px-2 py-0.5 rounded-sm text-xs ${movement.type === "IN" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                                            }`}>
                                            {movement.type === "IN" ? "+" : "-"}{movement.quantity}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
