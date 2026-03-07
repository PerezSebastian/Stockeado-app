"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
    return (
        <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="w-full justify-start text-zinc-600 hover:text-red-600 hover:bg-red-50"
        >
            <LogOut className="mr-2 h-5 w-5" />
            Cerrar Sesión
        </Button>
    );
}
