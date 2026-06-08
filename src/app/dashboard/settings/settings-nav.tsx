"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, CreditCard, Palette, Tags, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsNav() {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Perfil del Negocio",
      href: "/dashboard/settings",
      icon: Building2,
      exact: true,
    },
    {
      name: "Apariencia",
      href: "/dashboard/settings/appearance",
      icon: Palette,
      exact: false,
    },
    {
      name: "Categorias",
      href: "/dashboard/settings/categories",
      icon: Tags,
      exact: false,
    },
    {
      name: "Metodos de Pago",
      href: "/dashboard/settings/payments",
      icon: CreditCard,
      exact: false,
    },
    {
      name: "Mi Cuenta",
      href: "/dashboard/settings/account",
      icon: UserCircle,
      exact: false,
    },
  ];

  return (
    <nav className="flex space-x-2 md:flex-col md:space-x-0 md:space-y-1">
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <tab.icon
              className={cn(
                "h-5 w-5 shrink-0 transition-all duration-300",
                isActive
                  ? "scale-110 text-primary-foreground"
                  : "text-muted-foreground group-hover:text-accent-foreground group-hover:scale-110"
              )}
            />
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
