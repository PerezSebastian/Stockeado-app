"use client";

import { LogoutButton } from "@/components/logout-button";
import { NavLinks } from "./nav-links";

interface MobileSidebarContentProps {
  role?: string;
  onClose: () => void;
}

export function MobileSidebarContent({ role, onClose }: MobileSidebarContentProps) {
  return (
    <>
      <div className="border-b border-sidebar-border bg-sidebar p-6">
        <h2 className="line-clamp-1 text-xl font-black tracking-tighter text-sidebar-foreground">
          Stockeado
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto bg-sidebar/80 p-4">
        <NavLinks role={role} onClick={onClose} />
      </div>
      <div className="border-t border-sidebar-border bg-sidebar p-4">
        <LogoutButton />
      </div>
    </>
  );
}
