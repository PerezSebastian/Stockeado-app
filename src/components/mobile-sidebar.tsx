"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MobileSidebarContent } from "./dashboard/mobile-sidebar-content";

export function MobileSidebar({ role }: { role?: string }) {
  const [open, setOpen] = useState(false);

  const onClose = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[280px] flex-col border-border bg-sidebar p-0">
        <SheetTitle className="sr-only">Menu de navegacion</SheetTitle>
        <MobileSidebarContent role={role} onClose={onClose} />
      </SheetContent>
    </Sheet>
  );
}
