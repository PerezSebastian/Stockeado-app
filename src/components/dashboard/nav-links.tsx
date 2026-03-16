"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import { Home, Package, ShoppingCart, Settings, Users, ArrowRightLeft, ReceiptText, Truck, TrendingUp, Calculator } from "lucide-react";

interface NavLinksProps {
    role?: string;
    onClick?: () => void;
}

export function NavLinks({ role, onClick }: NavLinksProps) {
    const pathname = usePathname();
    const isAdmin = role === "ADMIN";
    const isOwner = role === "OWNER";

    const items = [
        { name: "Inicio", href: "/dashboard", icon: Home },
        { name: "Estadísticas", href: "/dashboard/analytics", icon: TrendingUp },
        { name: "Inventario", href: "/dashboard/inventory", icon: Package },
        { name: "Movimientos", href: "/dashboard/movements", icon: ArrowRightLeft },
        { name: "Ventas", href: "/dashboard/sales", icon: ReceiptText },
        { name: "Compras", href: "/dashboard/purchases", icon: Truck },
        { name: "Punto de Venta", href: "/dashboard/pos", icon: ShoppingCart },
        { name: "Gastos Fijos", href: "/dashboard/expenses", icon: Calculator },
        ...(isAdmin || isOwner ? [{ name: "Usuarios", href: "/dashboard/users", icon: Users }] : []),
        { name: "Configuración", href: "/dashboard/settings", icon: Settings },
    ];

    return (
        <div className="flex flex-col gap-1">
            {items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={onClick}
                        className={cn(
                            "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 cursor-pointer",
                            isActive
                                ? "bg-zinc-900 text-white shadow-lg shadow-zinc-200"
                                : "text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900"
                        )}
                    >
                        <item.icon className={cn(
                            "h-5 w-5 shrink-0 transition-all duration-300",
                            isActive ? "text-white scale-110" : "text-zinc-400 group-hover:text-zinc-900 group-hover:scale-110"
                        )} />
                        {item.name}

                        {/* Indicador de estado activo (Lineal sutil) */}
                        {isActive && (
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-white/30" />
                        )}

                        {/* Punto decorativo en Hover */}
                        {!isActive && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-zinc-900 scale-0 transition-transform duration-300 group-hover:scale-100 opacity-20" />
                        )}
                    </Link>
                );
            })}
        </div>
    );
}
