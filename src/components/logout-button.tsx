"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
    return (
        <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="group w-full justify-start text-zinc-600 hover:text-red-700 hover:bg-red-50 rounded-xl px-4 py-3 h-auto font-semibold transition-all duration-300 cursor-pointer"
        >
            <LogOut className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
            Cerrar Sesión
        </Button>
    );
}
