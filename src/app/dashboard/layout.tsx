import { Home, Package, ShoppingCart, Settings, Menu, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { auth } from "@/auth";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

interface NavItem {
    name: string;
    href: string;
    icon: any;
}

const NavLinks = ({ items, onClick }: { items: NavItem[], onClick?: () => void }) => (
    <>
        {items.map((item) => (
            <Link
                key={item.name}
                href={item.href}
                onClick={onClick}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.98]"
            >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
            </Link>
        ))}
    </>
);

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";

    const navItems: NavItem[] = [
        { name: "Inicio", href: "/dashboard", icon: Home },
        { name: "Inventario", href: "/dashboard/inventory", icon: Package },
        { name: "Punto de Venta", href: "/dashboard/pos", icon: ShoppingCart },
        ...(isAdmin ? [{ name: "Usuarios", href: "/dashboard/users", icon: Users }] : []),
        { name: "Configuración", href: "/dashboard/settings", icon: Settings },
    ];

    return (
        <div className="flex min-h-screen w-full bg-zinc-50/50 overflow-hidden">
            {/* Sidebar para Escritorio */}
            <aside className="hidden w-64 flex-col border-r bg-white md:flex h-screen sticky top-0 shrink-0">
                <div className="flex h-16 items-center border-b px-6 justify-center">
                    <span className="text-xl font-black tracking-tighter text-zinc-900">Galape Admin</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <nav className="flex flex-col gap-1">
                        <NavLinks items={navItems} />
                    </nav>
                </div>

                <div className="border-t p-4 bg-zinc-50/20">
                    <LogoutButton />
                </div>
            </aside>

            {/* Contenedor Principal */}
            <div className="flex flex-1 flex-col h-screen overflow-hidden">
                {/* Cabecera Móvil */}
                <header
                    className="flex h-16 items-center border-b bg-white px-6 md:hidden shrink-0"
                    suppressHydrationWarning
                >
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[280px] flex flex-col p-0">
                            <div className="p-6 border-b">
                                <h2 className="font-black tracking-tighter text-xl">Galape Admin</h2>
                            </div>
                            <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
                                <NavLinks items={navItems} />
                            </nav>
                            <div className="p-4 border-t">
                                <LogoutButton />
                            </div>
                        </SheetContent>
                    </Sheet>
                    <span className="ml-4 text-lg font-black tracking-tighter">Galape Admin</span>
                </header>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-y-auto w-full">
                    <div className="p-4 md:p-8 max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
