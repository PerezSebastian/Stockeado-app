import { Home, Package, ShoppingCart, Settings, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const navItems = [
    { name: "Inicio", href: "/dashboard", icon: Home },
    { name: "Inventario", href: "/dashboard/inventory", icon: Package },
    { name: "Punto de Venta", href: "/dashboard/pos", icon: ShoppingCart },
    { name: "Configuración", href: "#", icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="flex min-h-screen w-full bg-zinc-50/50">
            {/* Sidebar para Escritorio */}
            <aside className="hidden w-64 flex-col border-r bg-white md:flex">
                <div className="flex h-16 items-center border-b px-6">
                    <span className="text-xl font-bold tracking-tight text-zinc-900">Galape Admin</span>
                </div>
                <div className="flex flex-1 items-start px-4 py-6">
                    <nav className="flex w-full flex-col gap-2">
                        {navItems.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </a>
                        ))}
                    </nav>
                </div>
                <div className="border-t p-4">
                    <Button variant="ghost" className="w-full justify-start text-zinc-600 hover:text-red-600">
                        <LogOut className="mr-2 h-5 w-5" />
                        Cerrar Sesión
                    </Button>
                </div>
            </aside>

            {/* Contenedor Principal */}
            <div className="flex flex-1 flex-col">
                {/* Cabecera Móvil */}
                <header className="flex h-16 items-center border-b bg-white px-6 md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64">
                            <SheetHeader>
                                <SheetTitle className="text-left font-bold tracking-tight">Galape Admin</SheetTitle>
                            </SheetHeader>
                            <nav className="mt-6 flex flex-col gap-2">
                                {navItems.map((item) => (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {item.name}
                                    </a>
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <span className="ml-4 text-lg font-bold">Galape Admin</span>
                </header>

                {/* Dynamic Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
