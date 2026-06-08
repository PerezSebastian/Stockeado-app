import { auth } from "@/auth";
import { ChatLauncherGate } from "@/components/chat/chat-launcher-gate";
import { NavLinks } from "@/components/dashboard/nav-links";
import { LogoutButton } from "@/components/logout-button";
import { MobileSidebar } from "@/components/mobile-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-16 w-full items-center justify-center border-b border-sidebar-border px-6">
          <span className="text-xl font-black tracking-tighter text-sidebar-foreground">
            Stockeado
          </span>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
          <NavLinks role={role} />
        </div>

        <div className="border-t border-sidebar-border bg-sidebar/80 p-4">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="flex h-16 w-full shrink-0 items-center border-b border-border bg-background px-6 md:hidden">
          <MobileSidebar role={role} />
          <span className="ml-4 text-lg font-black tracking-tighter text-foreground">Stockeado</span>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full w-full min-w-0 flex-col pl-4 pr-2 pt-4 pb-[calc(1rem+var(--assistant-launcher-safe-area-bottom,0px))] md:pl-8 md:pr-3 md:pt-8 md:pb-[calc(2rem+var(--assistant-launcher-safe-area-bottom,0px))]">
            {children}
          </div>
        </main>
      </div>
      <ChatLauncherGate />
    </div>
  );
}
