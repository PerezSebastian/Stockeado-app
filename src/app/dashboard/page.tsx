import { Suspense } from "react";
import {
  ArrowRightLeft,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { getDashboardStats } from "@/actions/dashboard";
import { db } from "@/lib/db";
import { WelcomeToast } from "@/components/welcome-toast";
import { ThemeSelector } from "@/components/theme-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const [stats, session] = await Promise.all([getDashboardStats(), auth()]);

  if ("error" in stats) {
    return (
      <div className="rounded-2xl border border-danger-soft-foreground/20 bg-danger-soft px-6 py-5 text-center text-danger-soft-foreground">
        <p>Error cargando estadisticas: {stats.error}</p>
      </div>
    );
  }

  const {
    totalSalesToday,
    ticketsToday,
    criticalStockProducts,
    activeProducts,
    recentSales,
    recentMovements,
  } = stats;

  const userTheme = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { themeMode: true },
      })
    : null;
  const currentThemeMode = userTheme?.themeMode ?? session?.user?.themeMode ?? "LIGHT";

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <WelcomeToast />
      </Suspense>

      <section className="space-y-4">
        <ThemeSelector currentThemeMode={currentThemeMode} variant="compact" />

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
              Bienvenido, {stats.businessName}
            </CardTitle>
            <CardDescription className="text-base">
              Resumen general de tu negocio y desempeno reciente.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border bg-surface-subtle p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Ventas Hoy</p>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-4 text-2xl font-bold text-foreground">
                $
                {totalSalesToday.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Ingresos totales del dia</p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-subtle p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Tickets Hoy</p>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-4 text-2xl font-bold text-foreground">{ticketsToday}</p>
              <p className="mt-1 text-xs text-muted-foreground">Ventas cerradas hoy</p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-subtle p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Stock Critico</p>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-4 text-2xl font-bold text-foreground">{criticalStockProducts}</p>
              <p
                className={`mt-1 text-xs font-medium ${
                  criticalStockProducts > 0 ? "text-danger-soft-foreground" : "text-success"
                }`}
              >
                {criticalStockProducts > 0 ? "Requieren atencion" : "Stock saludable"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-subtle p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Productos Registrados</p>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-4 text-2xl font-bold text-foreground">{activeProducts}</p>
              <p className="mt-1 text-xs text-muted-foreground">Activos en el catalogo</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Ventas Recientes
            </CardTitle>
            <CardDescription>Tus ultimos 5 ingresos.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                No hay ventas recientes hoy
              </div>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface-subtle p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {sale.items[0]?.product?.name || "Varios"}
                        <span className="ml-1 font-normal text-muted-foreground">
                          {sale.items.length > 1 ? `y ${sale.items.length - 1} mas` : ""}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • {sale.paymentMethod}
                      </p>
                    </div>
                    <div className="font-black text-success">
                      +$
                      {Number(sale.total).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Movimientos Recientes
            </CardTitle>
            <CardDescription>Ultimas entradas y salidas de stock.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                No hay movimientos recientes
              </div>
            ) : (
              <div className="space-y-4">
                {recentMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface-subtle p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {movement.product?.name || "Producto generico"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(movement.createdAt).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • {movement.reason || "Sin especificar"}
                      </p>
                    </div>
                    <div
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        movement.type === "IN"
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                      }`}
                    >
                      {movement.type === "IN" ? "+" : "-"}
                      {movement.quantity}
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
