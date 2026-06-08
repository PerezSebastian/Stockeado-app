"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRightLeft,
  BookOpen,
  Bot,
  Calculator,
  Home,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { UserRole } from "@prisma/client";

interface NavLinksProps {
  role?: string;
  onClick?: () => void;
}

export function NavLinks({ role, onClick }: NavLinksProps) {
  const pathname = usePathname();
  const isAdmin = role === UserRole.ADMIN;
  const isOwner = role === UserRole.OWNER;

  const items = [
    { name: "Inicio", href: "/dashboard", icon: Home },
    { name: "Asistente", href: "/dashboard/assistant", icon: Bot },
    { name: "Estadisticas", href: "/dashboard/analytics", icon: TrendingUp },
    { name: "Inventario", href: "/dashboard/inventory", icon: Package },
    { name: "Catálogo", href: "/dashboard/catalog", icon: BookOpen },
    { name: "Movimientos", href: "/dashboard/movements", icon: ArrowRightLeft },
    { name: "Ventas", href: "/dashboard/sales", icon: ReceiptText },
    { name: "Compras", href: "/dashboard/purchases", icon: Truck },
    { name: "Punto de Venta", href: "/dashboard/pos", icon: ShoppingCart },
    { name: "Gastos Fijos", href: "/dashboard/expenses", icon: Calculator },
    ...(isAdmin || isOwner ? [{ name: "Usuarios", href: "/dashboard/users", icon: Users }] : []),
    { name: "Configuracion", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onClick}
            className={cn(
              "group relative flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300",
              isActive
                ? "bg-sidebar-primary/14 text-sidebar-foreground shadow-sm ring-1 ring-sidebar-primary/18"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon
              className={cn(
                "h-5 w-5 shrink-0 transition-all duration-300",
                isActive
                  ? "scale-110 text-sidebar-primary"
                  : "text-sidebar-foreground/55 group-hover:scale-110 group-hover:text-sidebar-accent-foreground"
              )}
            />
            {item.name}
            {isActive && (
              <div className="absolute left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-sidebar-primary" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
