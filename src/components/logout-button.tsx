"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      onClick={() => signOut({ callbackUrl: "/auth/login" })}
      className="group h-auto w-full justify-start rounded-xl px-4 py-3 font-semibold text-sidebar-foreground/75 transition-all duration-300 hover:bg-danger-soft hover:text-danger-soft-foreground"
    >
      <LogOut className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
      Cerrar Sesion
    </Button>
  );
}
