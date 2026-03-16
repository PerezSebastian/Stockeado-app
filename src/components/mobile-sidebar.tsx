"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

import { MobileSidebarContent } from "./dashboard/mobile-sidebar-content";

export function MobileSidebar({ role }: { role?: string }) {
    const [isMounted, setIsMounted] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <Button variant="outline" size="icon" className="shrink-0" suppressHydrationWarning>
                <Menu className="h-5 w-5" />
            </Button>
        );
    }

    const onClose = () => setOpen(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] flex flex-col p-0 bg-white">
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                <MobileSidebarContent role={role} onClose={onClose} />
            </SheetContent>
        </Sheet>
    );
}
