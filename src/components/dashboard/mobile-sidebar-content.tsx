"use client";

import { NavLinks } from "./nav-links";
import { LogoutButton } from "@/components/logout-button";

interface MobileSidebarContentProps {
    role?: string;
    onClose: () => void;
}

export function MobileSidebarContent({ role, onClose }: MobileSidebarContentProps) {
    return (
        <>
            <div className="p-6 border-b bg-white">
                <h2 className="font-black tracking-tighter text-xl text-zinc-900 line-clamp-1">Stockeado</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-white/50">
                <NavLinks role={role} onClick={onClose} />
            </div>
            <div className="p-4 border-t bg-zinc-50">
                <LogoutButton />
            </div>
        </>
    );
}
