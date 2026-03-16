import { LogoutButton } from "@/components/logout-button";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { auth } from "@/auth";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

import { NavLinks } from "@/components/dashboard/nav-links";

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
    const session = await auth();
    const role = session?.user?.role;

    return (
        <div className="flex h-screen w-full bg-zinc-50/50 overflow-hidden">
            {/* Sidebar para Escritorio */}
            <aside className="hidden w-64 flex-col border-r bg-white md:flex h-screen sticky top-0 shrink-0">
                <div className="flex h-16 items-center border-b px-6 justify-center">
                    <span className="text-xl font-black tracking-tighter text-zinc-900">Stockeado</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <NavLinks role={role} />
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
                >
                    <MobileSidebar role={role} />
                    <span className="ml-4 text-lg font-black tracking-tighter">Stockeado</span>
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
