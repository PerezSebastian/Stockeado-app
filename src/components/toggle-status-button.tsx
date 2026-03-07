"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleBusinessStatusAction } from "@/actions/user-admin";
import { Power, PowerOff } from "lucide-react";

interface ToggleStatusButtonProps {
    businessId: string;
    currentStatus: "ACTIVE" | "INACTIVE";
}

export function ToggleStatusButton({ businessId, currentStatus }: ToggleStatusButtonProps) {
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        startTransition(() => {
            toggleBusinessStatusAction(businessId).then((data) => {
                if (data?.success) {
                    window.location.reload();
                } else if (data?.error) {
                    alert(data.error);
                }
            });
        });
    };

    return (
        <Button
            size="sm"
            variant={currentStatus === "ACTIVE" ? "destructive" : "default"}
            className="font-bold gap-1.5 h-8 px-3 transition-all active:scale-95"
            disabled={isPending}
            onClick={handleToggle}
        >
            {currentStatus === "ACTIVE" ? (
                <>
                    <PowerOff className="h-3.5 w-3.5" />
                    Baja
                </>
            ) : (
                <>
                    <Power className="h-3.5 w-3.5" />
                    Alta
                </>
            )}
        </Button>
    );
}
